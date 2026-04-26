import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { execFile } from 'child_process';

const MAX_PACKAGE_BYTES = 80 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 3000;
const MAX_ZIP_WARN_ENTRIES = 1200;
const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024;
const ZIP_RATIO_WARN = 10;
const ZIP_RATIO_BLOCK = 25;
const PRIVATE_STORAGE_DRIVER = 'private_disk';
const DIGITAL_ASSET_TYPES = ['digital_package', 'game_package'];
const WINDOWS_DEFENDER_SCAN_TIMEOUT_MS = 5 * 60 * 1000;
const WINDOWS_DEFENDER_PLATFORM_DIR = 'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform';
const WINDOWS_DEFENDER_FALLBACK_PATHS = [
  'C:\\Program Files\\Windows Defender\\MpCmdRun.exe',
  'C:\\Program Files\\Microsoft Defender\\MpCmdRun.exe'
];

const DANGEROUS_ENTRY_NAMES = new Set([
  'autorun.inf',
  'desktop.ini',
  'run.bat',
  'setup.bat',
  'install.bat',
  'launch.bat',
  'launch.cmd',
  'setup.cmd',
  'install.cmd'
]);

const BLOCKED_ENTRY_EXTENSIONS = new Set([
  '.bat',
  '.cmd',
  '.ps1',
  '.vbs',
  '.scr',
  '.pif',
  '.reg',
  '.lnk',
  '.msi',
  '.com'
]);

const NESTED_ARCHIVE_EXTENSIONS = new Set([
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.iso',
  '.dmg',
  '.img'
]);

const CLUTTER_ENTRY_PATTERNS = [
  /^__macosx\//i,
  /(^|\/)\.ds_store$/i,
  /(^|\/)thumbs\.db$/i
];

const uuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  );

const resolveWindowsDefenderCli = () => {
  if (process.platform !== 'win32') return null;

  try {
    if (fs.existsSync(WINDOWS_DEFENDER_PLATFORM_DIR)) {
      const candidates = fs
        .readdirSync(WINDOWS_DEFENDER_PLATFORM_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' }));

      for (const version of candidates) {
        const executablePath = path.join(WINDOWS_DEFENDER_PLATFORM_DIR, version, 'MpCmdRun.exe');
        if (fs.existsSync(executablePath)) {
          return executablePath;
        }
      }
    }
  } catch {
    // Fall back to the static install paths below.
  }

  return WINDOWS_DEFENDER_FALLBACK_PATHS.find((candidate) => fs.existsSync(candidate)) || null;
};

const WINDOWS_DEFENDER_CLI = resolveWindowsDefenderCli();

const execFileAsync = (filePath, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(filePath, args, { windowsHide: true, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });

const parseMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const jsonObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const asText = (value) => String(value || '').trim();

const nowIso = () => new Date().toISOString();

const ensureDirectory = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const sanitizeBaseName = (fileName = 'asset') =>
  String(fileName)
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'asset';

const sanitizeDownloadFileName = (fileName = 'download.zip') => {
  const sanitized = String(fileName || 'download.zip')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized || 'download.zip';
};

const toStringArray = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((entry) => asText(entry))
          .filter(Boolean)
      )
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[,\n|]/g)
          .map((entry) => asText(entry))
          .filter(Boolean)
      )
    );
  }

  return [];
};

const uniqueUrls = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => asText(entry))
        .filter(Boolean)
    )
  );

const getDigitalExperienceType = (metadata) => {
  const gameDetails = jsonObject(metadata?.gameDetails);
  const digitalDelivery = jsonObject(metadata?.digitalDelivery);
  const explicit = asText(
    gameDetails.experienceType ||
      digitalDelivery.experienceType ||
      metadata?.experienceType ||
      metadata?.marketplaceCategory
  ).toLowerCase();
  return explicit === 'game' || explicit === 'games' ? 'game' : 'digital';
};

const isDigitalItemRow = (row) => {
  const metadata = jsonObject(row?.metadata);
  return (
    asText(metadata.itemType || metadata.productType).toLowerCase() === 'digital' ||
    Boolean(metadata.digitalDelivery)
  );
};

const isGameRow = (row) => {
  const metadata = jsonObject(row?.metadata);
  const explicit = getDigitalExperienceType(metadata);
  if (explicit === 'game') return true;
  return asText(metadata.category).toLowerCase().includes('game');
};

const getFileExtension = (fileName = '') => {
  const match = /\.[^.]+$/.exec(String(fileName || '').trim().toLowerCase());
  return match ? match[0] : '';
};

const isClutterEntry = (entryName) =>
  CLUTTER_ENTRY_PATTERNS.some((pattern) => pattern.test(String(entryName || '').toLowerCase()));

const normalizeZipEntryName = (entryName) => String(entryName || '').replace(/\\/g, '/').trim();

const parseZipManifest = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) {
    throw new Error('ZIP package is incomplete.');
  }

  if (buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Only ZIP packages are accepted.');
  }

  const searchStart = Math.max(0, buffer.length - 0x10000 - 22);
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= searchStart; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error('ZIP central directory is missing.');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error('ZIP64 packages are not supported yet.');
  }

  if (
    centralDirectoryOffset < 0 ||
    centralDirectoryOffset >= buffer.length ||
    centralDirectoryOffset + centralDirectorySize > buffer.length
  ) {
    throw new Error('ZIP central directory is invalid.');
  }

  const entries = [];
  let cursor = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length) {
      throw new Error('ZIP package is truncated.');
    }

    const signature = buffer.readUInt32LE(cursor);
    if (signature !== 0x02014b50) {
      throw new Error('ZIP directory entry is invalid.');
    }

    const generalPurposeFlag = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const fileCommentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const utf8 = (generalPurposeFlag & 0x0800) !== 0;
    const fileNameStart = cursor + 46;
    const fileNameEnd = fileNameStart + fileNameLength;

    if (fileNameEnd > buffer.length) {
      throw new Error('ZIP file name is invalid.');
    }

    const rawName = buffer.subarray(fileNameStart, fileNameEnd);
    const name = normalizeZipEntryName(rawName.toString(utf8 ? 'utf8' : 'binary'));
    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      generalPurposeFlag,
      compressionMethod,
      localHeaderOffset,
      isEncrypted: (generalPurposeFlag & 0x0001) !== 0,
      isDirectory: name.endsWith('/')
    });

    cursor = fileNameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
};

const scanZipPackage = (buffer, fileName) => {
  const blocked = [];
  const warnings = [];
  const extension = getFileExtension(fileName);

  if (extension !== '.zip') {
    blocked.push('Package must be uploaded as a .zip file.');
  }

  let entries = [];
  try {
    entries = parseZipManifest(buffer);
  } catch (error) {
    blocked.push(error?.message || 'ZIP package could not be read.');
  }

  const fileEntries = entries.filter((entry) => !entry.isDirectory);
  const totalUncompressedBytes = fileEntries.reduce(
    (sum, entry) => sum + Number(entry.uncompressedSize || 0),
    0
  );
  const compressionRatio =
    buffer.length > 0 ? Number((totalUncompressedBytes / buffer.length).toFixed(2)) : 0;
  const normalizedNames = new Set();
  let executableCount = 0;

  fileEntries.forEach((entry) => {
    const lower = entry.name.toLowerCase();
    const baseName = lower.split('/').filter(Boolean).pop() || lower;
    const hasTraversal =
      lower.startsWith('/') ||
      lower.startsWith('\\') ||
      /^[a-z]:/i.test(lower) ||
      lower.includes('../') ||
      lower.includes('..\\');

    if (!entry.name) {
      blocked.push('ZIP package contains an empty entry name.');
      return;
    }

    if (/[\u0000-\u001f]/.test(entry.name)) {
      blocked.push(`Entry "${entry.name}" contains control characters.`);
    }

    if (hasTraversal) {
      blocked.push(`Entry "${entry.name}" uses a disallowed file path.`);
    }

    if (entry.isEncrypted) {
      blocked.push(`Entry "${entry.name}" is encrypted and cannot be scanned.`);
    }

    if (normalizedNames.has(lower)) {
      warnings.push(`Duplicate file path detected: ${entry.name}`);
    } else {
      normalizedNames.add(lower);
    }

    if (DANGEROUS_ENTRY_NAMES.has(baseName) || BLOCKED_ENTRY_EXTENSIONS.has(getFileExtension(baseName))) {
      blocked.push(`Entry "${entry.name}" uses a blocked launcher or script format.`);
    }

    if (NESTED_ARCHIVE_EXTENSIONS.has(getFileExtension(baseName))) {
      blocked.push(`Nested archive "${entry.name}" is not allowed inside the package.`);
    }

    if (isClutterEntry(lower)) {
      warnings.push(`Remove packaging clutter file "${entry.name}" to save space.`);
    }

    if (getFileExtension(baseName) === '.exe' || getFileExtension(baseName) === '.dll') {
      executableCount += 1;
    }
  });

  if (fileEntries.length === 0) {
    blocked.push('ZIP package does not contain any files.');
  }

  if (fileEntries.length > MAX_ZIP_ENTRIES) {
    blocked.push(`ZIP package contains too many files (${fileEntries.length}).`);
  } else if (fileEntries.length > MAX_ZIP_WARN_ENTRIES) {
    warnings.push(`ZIP package contains a high file count (${fileEntries.length}).`);
  }

  if (totalUncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
    blocked.push('ZIP package expands to more than the allowed unpacked size.');
  }

  if (compressionRatio >= ZIP_RATIO_BLOCK) {
    blocked.push(`ZIP compression ratio (${compressionRatio}x) looks unsafe.`);
  } else if (compressionRatio >= ZIP_RATIO_WARN) {
    warnings.push(`ZIP compression ratio is high (${compressionRatio}x).`);
  }

  if (executableCount > 10) {
    warnings.push('Package contains a large number of executable files.');
  }

  const status = blocked.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'clean';
  const summary =
    status === 'clean'
      ? 'Package passed ZIP structure and security heuristics.'
      : status === 'warning'
        ? 'Package passed, but housekeeping issues were detected.'
        : 'Package failed the security scan.';

  return {
    status,
    summary,
    blocked,
    warnings,
    scannedAt: nowIso(),
    packageSha256: createHash('sha256').update(buffer).digest('hex'),
    zipSizeBytes: buffer.length,
    totalUncompressedBytes,
    entryCount: fileEntries.length,
    compressionRatio,
    sampleEntries: fileEntries.slice(0, 12).map((entry) => entry.name)
  };
};

const collapseScanText = (...segments) =>
  segments
    .flatMap((segment) => String(segment || '').split(/\r?\n/g))
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 600);

const runAntivirusScan = async (filePath) => {
  if (!WINDOWS_DEFENDER_CLI) {
    return {
      engine: 'windows_defender',
      status: 'warning',
      summary: 'Windows Defender CLI is unavailable, so the package cannot be published until antivirus scanning is available.'
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      WINDOWS_DEFENDER_CLI,
      ['-Scan', '-ScanType', '3', '-File', filePath, '-DisableRemediation'],
      {
        timeout: WINDOWS_DEFENDER_SCAN_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 4
      }
    );

    return {
      engine: 'windows_defender',
      status: 'clean',
      summary: collapseScanText(stdout, stderr) || 'Windows Defender found no threats in the uploaded package.'
    };
  } catch (error) {
    const exitCode = Number(error?.code);
    const detail = collapseScanText(error?.stdout, error?.stderr, error?.message);

    if (exitCode === 2) {
      return {
        engine: 'windows_defender',
        status: 'blocked',
        summary:
          detail ||
          'Windows Defender flagged the uploaded package during antivirus scanning.'
      };
    }

    const timeoutDetected =
      Boolean(error?.killed) || /timed out|timeout/i.test(String(error?.message || ''));

    return {
      engine: 'windows_defender',
      status: 'warning',
      summary:
        detail ||
        (timeoutDetected
          ? 'Windows Defender scan timed out before the antivirus pass completed.'
          : 'Windows Defender could not complete the antivirus scan.')
    };
  }
};

const mergePackageScanReports = (zipScan, antivirusScan) => {
  const blocked = [...(Array.isArray(zipScan?.blocked) ? zipScan.blocked : [])];
  const warnings = [...(Array.isArray(zipScan?.warnings) ? zipScan.warnings : [])];

  if (antivirusScan?.status === 'blocked') {
    blocked.push(antivirusScan.summary);
  } else if (antivirusScan?.status === 'warning') {
    warnings.push(antivirusScan.summary);
  }

  const status = blocked.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'clean';
  const summary =
    status === 'blocked'
      ? antivirusScan?.status === 'blocked'
        ? 'Package failed antivirus or ZIP security validation.'
        : 'Package failed the security scan.'
      : status === 'warning'
        ? antivirusScan?.status === 'warning'
          ? 'Package passed ZIP checks, but antivirus scanning requires attention before the listing can publish.'
          : 'Package passed, but housekeeping issues were detected.'
        : antivirusScan?.status === 'clean'
          ? 'Package passed ZIP validation and Windows Defender antivirus scanning.'
          : 'Package passed ZIP structure and security heuristics.';

  return {
    ...zipScan,
    status,
    summary,
    blocked,
    warnings,
    antivirusEngine: antivirusScan?.engine || '',
    antivirusStatus: antivirusScan?.status || 'pending',
    antivirusSummary: antivirusScan?.summary || ''
  };
};

const readPrivateAssetRow = async (supabase, assetId) => {
  if (!assetId) return null;
  const { data, error } = await supabase.from('uploaded_assets').select('*').eq('id', assetId).maybeSingle();
  if (error) throw error;
  return data || null;
};

const loadUsersById = async (supabase, ids = []) => {
  const uniqueIds = Array.from(new Set(ids.map((value) => asText(value)).filter(Boolean)));
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase
    .from('users')
    .select('id,firebase_uid,name,email,avatar_url')
    .in('id', uniqueIds);
  if (error) throw error;
  return new Map((data || []).map((row) => [String(row.id), row]));
};

const loadItemImages = async (supabase, itemIds = []) => {
  const uniqueIds = Array.from(new Set(itemIds.map((value) => asText(value)).filter(Boolean)));
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase
    .from('item_images')
    .select('item_id,url,sort_order')
    .in('item_id', uniqueIds)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  const map = new Map();
  (data || []).forEach((row) => {
    const key = String(row.item_id);
    const current = map.get(key) || [];
    current.push(String(row.url || ''));
    map.set(key, current);
  });
  return map;
};

const loadSalesMetrics = async (supabase, itemIds = []) => {
  const uniqueIds = Array.from(new Set(itemIds.map((value) => asText(value)).filter(Boolean)));
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from('order_items')
    .select('item_id,quantity,unit_price,order_id,orders!inner(status,created_at)')
    .in('item_id', uniqueIds);
  if (error) throw error;

  const metrics = new Map();
  (data || []).forEach((row) => {
    const orderStatus = asText(row?.orders?.status).toLowerCase();
    if (orderStatus === 'cancelled') return;
    const itemId = String(row.item_id || '');
    if (!itemId) return;
    const existing = metrics.get(itemId) || {
      purchases: 0,
      unitsSold: 0,
      grossRevenue: 0,
      lastPurchasedAt: null
    };
    existing.purchases += 1;
    existing.unitsSold += Math.max(1, Number(row.quantity || 1));
    existing.grossRevenue = parseMoney(
      existing.grossRevenue + parseMoney(row.unit_price) * Math.max(1, Number(row.quantity || 1))
    );
    const purchasedAt = asText(row?.orders?.created_at) || null;
    if (purchasedAt && (!existing.lastPurchasedAt || purchasedAt > existing.lastPurchasedAt)) {
      existing.lastPurchasedAt = purchasedAt;
    }
    metrics.set(itemId, existing);
  });
  return metrics;
};

const resolveCategoryId = async (supabase, categoryInput) => {
  const category = asText(categoryInput);
  if (!category) return null;

  if (uuidLike(category)) {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category)
      .maybeSingle();
    if (error) throw error;
    return data?.id || null;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id,name')
    .ilike('name', category)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data[0]?.id ? data[0].id : null;
};

const resolveImageUrls = (body, existingMetadata = {}) => {
  const coverImageUrl = asText(body.coverImageUrl || existingMetadata.coverImageUrl);
  const galleryImageUrls = uniqueUrls(body.galleryImageUrls || existingMetadata.galleryImageUrls || []);
  const combined = uniqueUrls([coverImageUrl, ...galleryImageUrls]);
  return {
    coverImageUrl: combined[0] || '',
    galleryImageUrls: combined
  };
};

const buildSellerSummaryRow = ({
  itemRow,
  userRow,
  imageUrls,
  metrics
}) => {
  const metadata = jsonObject(itemRow.metadata);
  const digitalDelivery = jsonObject(metadata.digitalDelivery);
  const gameDetails = jsonObject(metadata.gameDetails);

  return {
    id: String(itemRow.id),
    title: itemRow.title || metadata.title || 'Untitled listing',
    status: String(itemRow.status || 'draft'),
    createdAt: itemRow.created_at || nowIso(),
    updatedAt: itemRow.updated_at || itemRow.created_at || nowIso(),
    price: parseMoney(itemRow.sale_price || metadata.salePrice || 0),
    version: asText(metadata.version || digitalDelivery.packageVersion || ''),
    coverImageUrl: imageUrls[0] || metadata.coverImageUrl || '/icons/urbanprime.svg',
    creatorName: userRow?.name || metadata.ownerName || 'Seller',
    experienceType: getDigitalExperienceType(metadata),
    genres: toStringArray(gameDetails.genres),
    platforms: toStringArray(gameDetails.platforms || digitalDelivery.supportedPlatforms),
    purchases: Number(metrics?.purchases || 0),
    unitsSold: Number(metrics?.unitsSold || 0),
    grossRevenue: parseMoney(metrics?.grossRevenue || 0),
    downloads: Number(digitalDelivery.downloadCount || 0),
    scanStatus: asText(digitalDelivery?.scan?.status || 'pending') || 'pending',
    scanSummary: asText(digitalDelivery?.scan?.summary || ''),
    licenseType: asText(metadata.licenseType || '')
  };
};

const buildDiscoveryCard = ({ itemRow, userRow, imageUrls, metrics }) => {
  const metadata = jsonObject(itemRow.metadata);
  const digitalDelivery = jsonObject(metadata.digitalDelivery);
  const gameDetails = jsonObject(metadata.gameDetails);
  const coverImageUrl = imageUrls[0] || metadata.coverImageUrl || '/icons/urbanprime.svg';
  const heroImageUrl = imageUrls[1] || coverImageUrl;

  return {
    id: String(itemRow.id),
    title: itemRow.title || metadata.title || 'Untitled game',
    tagline: asText(gameDetails.tagline || metadata.tagline || '').slice(0, 180),
    description: asText(itemRow.description || metadata.description || '').slice(0, 320),
    coverImageUrl,
    heroImageUrl,
    price: parseMoney(itemRow.sale_price || metadata.salePrice || 0),
    version: asText(metadata.version || digitalDelivery.packageVersion || ''),
    creatorName: userRow?.name || metadata.ownerName || 'Creator',
    releaseDate: asText(gameDetails.releaseDate || itemRow.created_at || ''),
    genres: toStringArray(gameDetails.genres),
    platforms: toStringArray(gameDetails.platforms || digitalDelivery.supportedPlatforms),
    modes: toStringArray(gameDetails.modes),
    tags: toStringArray(gameDetails.tags),
    scanStatus: asText(digitalDelivery?.scan?.status || 'pending') || 'pending',
    purchases: Number(metrics?.purchases || 0),
    downloads: Number(digitalDelivery.downloadCount || 0)
  };
};

const buildSpecifications = ({
  developer,
  publisher,
  releaseDate,
  platforms,
  modes,
  experienceType
}) => {
  const specs = [];
  if (developer) specs.push({ key: 'Developer', value: developer });
  if (publisher) specs.push({ key: 'Publisher', value: publisher });
  if (releaseDate) specs.push({ key: 'Release', value: releaseDate });
  if (platforms.length) specs.push({ key: 'Platforms', value: platforms.join(', ') });
  if (modes.length) specs.push({ key: 'Modes', value: modes.join(', ') });
  specs.push({ key: 'Delivery', value: 'ZIP download' });
  specs.push({ key: 'Type', value: experienceType === 'game' ? 'Game build' : 'Digital product' });
  return specs;
};

const buildFeatureList = ({ tagline, genres, tags, platforms, modes }) => {
  const features = [];
  if (tagline) features.push(tagline);
  if (genres.length) features.push(`${genres.join(' / ')} experience`);
  if (platforms.length) features.push(`Runs on ${platforms.join(', ')}`);
  if (modes.length) features.push(`Includes ${modes.join(', ')}`);
  tags.slice(0, 3).forEach((tag) => features.push(tag));
  return Array.from(new Set(features.filter(Boolean))).slice(0, 8);
};

const createPrivateAsset = async ({
  supabase,
  privateUploadsRoot,
  ownerUserId,
  itemId,
  experienceType,
  packageFileName,
  base64Data
}) => {
  let binary;
  try {
    binary = Buffer.from(String(base64Data || ''), 'base64');
  } catch {
    throw new Error('Package payload is not valid base64.');
  }

  if (!binary.length) {
    throw new Error('Package payload is empty.');
  }

  if (binary.length > MAX_PACKAGE_BYTES) {
    throw new Error(`ZIP package exceeds the ${Math.round(MAX_PACKAGE_BYTES / (1024 * 1024))}MB limit.`);
  }

  const zipScan = scanZipPackage(binary, packageFileName);
  if (zipScan.status === 'blocked') {
    const error = new Error(zipScan.summary);
    error.scan = zipScan;
    throw error;
  }

  const assetId = randomUUID();
  const safeBase = sanitizeBaseName(packageFileName || 'package');
  const relativeDir = path.join(experienceType === 'game' ? 'games' : 'digital', ownerUserId);
  const relativePath = path.join(relativeDir, `${safeBase}-${assetId}.zip`);
  const fullDir = ensureDirectory(path.join(privateUploadsRoot, relativeDir));
  const fullPath = path.join(fullDir, `${safeBase}-${assetId}.zip`);
  fs.writeFileSync(fullPath, binary);

  const antivirusScan = await runAntivirusScan(fullPath);
  const scan = mergePackageScanReports(zipScan, antivirusScan);
  if (scan.status === 'blocked') {
    fs.rmSync(fullPath, { force: true });
    const error = new Error(scan.summary);
    error.scan = scan;
    throw error;
  }

  const payload = {
    id: assetId,
    owner_user_id: ownerUserId,
    owner_persona_id: null,
    asset_type: experienceType === 'game' ? 'game_package' : 'digital_package',
    file_name: packageFileName || `${safeBase}.zip`,
    mime_type: 'application/zip',
    size_bytes: binary.length,
    storage_driver: PRIVATE_STORAGE_DRIVER,
    storage_path: relativePath.replace(/\\/g, '/'),
    resource_id: itemId,
    is_public: false,
    metadata: {
      experienceType,
      scan,
      package_sha256: scan.packageSha256
    }
  };

  const { data, error } = await supabase.from('uploaded_assets').insert(payload).select('*').maybeSingle();
  if (error) {
    fs.rmSync(fullPath, { force: true });
    throw error;
  }

  return {
    asset: data || payload,
    scan
  };
};

const clonePrivateAsset = async ({ supabase, sourceAssetId, ownerUserId, itemId }) => {
  const source = await readPrivateAssetRow(supabase, sourceAssetId);
  if (!source) throw new Error('Source package could not be found.');
  if (String(source.owner_user_id || '') !== String(ownerUserId)) {
    throw new Error('You can only reuse your own package asset.');
  }

  const clone = {
    ...source,
    id: randomUUID(),
    resource_id: itemId,
    metadata: {
      ...jsonObject(source.metadata),
      cloned_from_asset_id: source.id,
      cloned_at: nowIso()
    }
  };

  const { data, error } = await supabase.from('uploaded_assets').insert(clone).select('*').maybeSingle();
  if (error) throw error;
  return {
    asset: data || clone,
    scan: jsonObject(source.metadata).scan || null
  };
};

const tryResolveCategoryId = async (supabase, category) => {
  try {
    return await resolveCategoryId(supabase, category);
  } catch {
    return null;
  }
};

const tryDeleteDraftArtifacts = async (supabase, itemId) => {
  if (!itemId) return;
  try {
    await supabase.from('item_images').delete().eq('item_id', itemId);
  } catch {
    // Best-effort cleanup for failed draft scaffolding.
  }
  try {
    await supabase.from('items').delete().eq('id', itemId);
  } catch {
    // Best-effort cleanup for failed draft scaffolding.
  }
};

const writeItemImages = async (supabase, itemId, imageUrls) => {
  await supabase.from('item_images').delete().eq('item_id', itemId);
  if (!imageUrls.length) return;
  const rows = imageUrls.map((url, index) => ({
    item_id: itemId,
    url,
    sort_order: index
  }));
  const { error } = await supabase.from('item_images').insert(rows);
  if (error) throw error;
};

const buildListingPayload = async ({
  supabase,
  body,
  existingItem,
  ownerUserId,
  packageAsset,
  scan
}) => {
  const existingMetadata = jsonObject(existingItem?.metadata);
  const existingDigitalDelivery = jsonObject(existingMetadata.digitalDelivery);
  const requestedExperienceType = asText(body.experienceType || existingMetadata.experienceType).toLowerCase();
  const experienceType = requestedExperienceType === 'game' ? 'game' : 'digital';
  const requestedStatus = asText(body.status || existingItem?.status || 'draft').toLowerCase();
  const listingStatus =
    requestedStatus === 'published' && scan?.status === 'warning'
      ? 'draft'
      : requestedStatus === 'published'
        ? 'published'
        : 'draft';

  const title = asText(body.title || existingItem?.title || '');
  if (!title) throw new Error('Title is required.');

  const description = asText(body.description || existingItem?.description || '');
  if (!description) throw new Error('Description is required.');

  const category = asText(body.category || existingMetadata.category || (experienceType === 'game' ? 'Games' : 'Digital Products'));
  const categoryId = await tryResolveCategoryId(supabase, category);

  const price = parseMoney(body.salePrice ?? existingItem?.sale_price ?? existingMetadata.salePrice ?? 0);
  if (price <= 0) {
    throw new Error('Digital listings must have a sale price greater than zero.');
  }

  const version = asText(body.version || existingMetadata.version || existingDigitalDelivery.packageVersion || '1.0.0');
  const licenseType = asText(body.licenseType || existingMetadata.licenseType || 'standard');
  const licenseDescription = asText(body.licenseDescription || existingMetadata.licenseDescription || '');
  const developer = asText(body.developer || existingMetadata.developer || existingMetadata.gameDetails?.developer || '');
  const publisher = asText(body.publisher || existingMetadata.publisher || existingMetadata.gameDetails?.publisher || '');
  const releaseDate = asText(body.releaseDate || existingMetadata.gameDetails?.releaseDate || '');
  const tagline = asText(body.tagline || existingMetadata.gameDetails?.tagline || '');
  const trailerUrl = asText(body.trailerUrl || existingMetadata.gameDetails?.trailerUrl || '');
  const genres = toStringArray(body.genres || existingMetadata.gameDetails?.genres);
  const platforms = toStringArray(body.platforms || existingMetadata.gameDetails?.platforms || existingDigitalDelivery.supportedPlatforms);
  const modes = toStringArray(body.modes || existingMetadata.gameDetails?.modes);
  const tags = toStringArray(body.tags || existingMetadata.gameDetails?.tags);
  const { coverImageUrl, galleryImageUrls } = resolveImageUrls(body, existingMetadata);
  const features = buildFeatureList({ tagline, genres, tags, platforms, modes });
  const specifications = buildSpecifications({ developer, publisher, releaseDate, platforms, modes, experienceType });

  const nextDigitalDelivery = {
    ...existingDigitalDelivery,
    experienceType,
    packageAssetId: packageAsset?.id || existingDigitalDelivery.packageAssetId || null,
    packageFileName: packageAsset?.file_name || existingDigitalDelivery.packageFileName || '',
    packageMimeType: packageAsset?.mime_type || existingDigitalDelivery.packageMimeType || 'application/zip',
    packageSizeBytes: Number(packageAsset?.size_bytes || existingDigitalDelivery.packageSizeBytes || 0),
    packageVersion: version,
    supportedPlatforms: platforms,
    scan: scan || existingDigitalDelivery.scan || null,
    zipOnly: true,
    downloadCount: Number(existingDigitalDelivery.downloadCount || 0)
  };

  if (!nextDigitalDelivery.packageAssetId) {
    throw new Error('A ZIP package is required.');
  }

  const metadata = {
    ...existingMetadata,
    title,
    description,
    category,
    coverImageUrl,
    galleryImageUrls,
    imageUrls: galleryImageUrls,
    images: galleryImageUrls,
    productType: 'digital',
    itemType: 'digital',
    version,
    licenseType,
    licenseDescription,
    features,
    specifications,
    experienceType,
    marketplaceCategory: experienceType === 'game' ? 'games' : 'digital',
    developer,
    publisher,
    digitalDelivery: nextDigitalDelivery,
    gameDetails: experienceType === 'game'
      ? {
          experienceType: 'game',
          tagline,
          developer,
          publisher,
          releaseDate,
          trailerUrl,
          genres,
          platforms,
          modes,
          tags
        }
      : undefined,
    tagline,
    avgRating: existingMetadata.avgRating ?? 0,
    reviews: Array.isArray(existingMetadata.reviews) ? existingMetadata.reviews : []
  };

  return {
    itemPayload: {
      seller_id: ownerUserId,
      category_id: categoryId,
      title,
      description,
      listing_type: 'sale',
      status: listingStatus,
      condition: 'new',
      brand: publisher || existingItem?.brand || null,
      currency: 'USD',
      sale_price: price,
      rental_price: null,
      auction_start_price: null,
      auction_reserve_price: null,
      auction_end_at: null,
      stock: Number(existingItem?.stock || 9999),
      is_featured: Boolean(existingItem?.is_featured),
      is_verified: Boolean(existingItem?.is_verified),
      metadata
    },
    metadata,
    imageUrls: galleryImageUrls,
    listingStatus,
    experienceType
  };
};

const collectDashboardListings = async ({ supabase, ownerUserId }) => {
  const { data: itemRows, error } = await supabase
    .from('items')
    .select('*')
    .eq('seller_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const digitalRows = (itemRows || []).filter((row) => isDigitalItemRow(row));
  const itemIds = digitalRows.map((row) => String(row.id));
  const [usersMap, imageMap, metricsMap] = await Promise.all([
    loadUsersById(supabase, [ownerUserId]),
    loadItemImages(supabase, itemIds),
    loadSalesMetrics(supabase, itemIds)
  ]);

  const ownerRow = usersMap.get(String(ownerUserId));
  const listings = digitalRows.map((itemRow) =>
    buildSellerSummaryRow({
      itemRow,
      userRow: ownerRow,
      imageUrls: imageMap.get(String(itemRow.id)) || [],
      metrics: metricsMap.get(String(itemRow.id)) || null
    })
  );

  const summary = listings.reduce(
    (acc, listing) => {
      acc.totalListings += 1;
      if (listing.status === 'published') acc.published += 1;
      if (listing.status === 'draft') acc.drafts += 1;
      if (listing.experienceType === 'game') acc.games += 1;
      acc.downloads += Number(listing.downloads || 0);
      acc.purchases += Number(listing.purchases || 0);
      acc.revenue = parseMoney(acc.revenue + Number(listing.grossRevenue || 0));
      if (listing.scanStatus === 'warning') acc.scanWarnings += 1;
      return acc;
    },
    {
      totalListings: 0,
      published: 0,
      drafts: 0,
      games: 0,
      downloads: 0,
      purchases: 0,
      revenue: 0,
      scanWarnings: 0
    }
  );

  return { summary, listings };
};

const collectDiscoveryPayload = async ({ supabase }) => {
  const { data: rows, error } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) throw error;

  const gameRows = (rows || []).filter((row) => isDigitalItemRow(row) && isGameRow(row));
  const itemIds = gameRows.map((row) => String(row.id));
  const ownerIds = gameRows.map((row) => String(row.seller_id || '')).filter(Boolean);

  const [usersMap, imageMap, metricsMap] = await Promise.all([
    loadUsersById(supabase, ownerIds),
    loadItemImages(supabase, itemIds),
    loadSalesMetrics(supabase, itemIds)
  ]);

  const cards = gameRows.map((itemRow) =>
    buildDiscoveryCard({
      itemRow,
      userRow: usersMap.get(String(itemRow.seller_id || '')),
      imageUrls: imageMap.get(String(itemRow.id)) || [],
      metrics: metricsMap.get(String(itemRow.id)) || null
    })
  );

  const featured = cards
    .slice()
    .sort((left, right) => Number(right.purchases || 0) - Number(left.purchases || 0))
    .slice(0, 6);
  const hero = featured[0] || cards[0] || null;
  const newReleases = cards.slice(0, 8);
  const topSellers = cards
    .slice()
    .sort((left, right) => {
      const revenueDelta = Number(right.purchases || 0) - Number(left.purchases || 0);
      if (revenueDelta !== 0) return revenueDelta;
      return Number(right.downloads || 0) - Number(left.downloads || 0);
    })
    .slice(0, 8);

  const shelvesByGenre = new Map();
  cards.forEach((card) => {
    const genres = card.genres.length ? card.genres : ['Featured'];
    genres.slice(0, 2).forEach((genre) => {
      const key = genre.toLowerCase();
      const current = shelvesByGenre.get(key) || {
        slug: key.replace(/[^a-z0-9]+/g, '-'),
        title: genre,
        items: []
      };
      if (current.items.length < 6) {
        current.items.push(card);
      }
      shelvesByGenre.set(key, current);
    });
  });

  const genreShelves = Array.from(shelvesByGenre.values())
    .filter((shelf) => shelf.items.length >= 2)
    .slice(0, 4);

  return {
    hero,
    featured,
    newReleases,
    topSellers,
    genreShelves,
    total: cards.length
  };
};

const loadDigitalLibraryEntries = async ({ supabase, ownerUserId }) => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id,created_at,status,total')
    .eq('buyer_id', ownerUserId)
    .order('created_at', { ascending: false })
    .limit(120);
  if (ordersError) throw ordersError;

  const orderIds = (orders || []).map((row) => row.id).filter(Boolean);
  if (!orderIds.length) return [];

  const [{ data: orderItems, error: orderItemsError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase
        .from('order_items')
        .select('id,order_id,item_id,quantity,unit_price,metadata,listing_type,items(title,metadata,seller_id)')
        .in('order_id', orderIds),
      supabase
        .from('payments')
        .select('order_id,status,created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
    ]);

  if (orderItemsError) throw orderItemsError;
  if (paymentsError) throw paymentsError;

  const itemIds = Array.from(
    new Set((orderItems || []).map((row) => asText(row.item_id)).filter(Boolean))
  );

  const [imageMap, sellerMap] = await Promise.all([
    loadItemImages(supabase, itemIds),
    loadUsersById(
      supabase,
      (orderItems || []).map((row) => row?.items?.seller_id).filter(Boolean)
    )
  ]);

  const orderMap = new Map((orders || []).map((row) => [String(row.id), row]));
  const paymentMap = new Map();
  (payments || []).forEach((row) => {
    if (!paymentMap.has(String(row.order_id))) {
      paymentMap.set(String(row.order_id), row);
    }
  });

  return (orderItems || [])
    .map((row) => {
      const itemMeta = jsonObject(row?.items?.metadata);
      const digitalDelivery = jsonObject(itemMeta.digitalDelivery);
      if (!digitalDelivery.packageAssetId) return null;
      const order = orderMap.get(String(row.order_id));
      const payment = paymentMap.get(String(row.order_id));
      const orderStatus = asText(order?.status).toLowerCase();
      const paymentStatus = asText(payment?.status || 'paid').toLowerCase();
      if (orderStatus === 'cancelled') return null;
      if (paymentStatus && !['paid', 'succeeded', 'completed', 'authorized', 'processing', 'pending'].includes(paymentStatus)) {
        return null;
      }

      const gameDetails = jsonObject(itemMeta.gameDetails);
      const imageUrls = imageMap.get(String(row.item_id)) || [];
      const seller = sellerMap.get(String(row?.items?.seller_id || ''));
      return {
        id: String(row.id),
        orderId: String(row.order_id),
        itemId: String(row.item_id || ''),
        title: row?.items?.title || itemMeta.title || 'Digital item',
        coverImageUrl: imageUrls[0] || itemMeta.coverImageUrl || '/icons/urbanprime.svg',
        purchasedAt: order?.created_at || nowIso(),
        version: asText(itemMeta.version || digitalDelivery.packageVersion || ''),
        pricePaid: parseMoney(row.unit_price) * Math.max(1, Number(row.quantity || 1)),
        creatorName: seller?.name || itemMeta.ownerName || 'Creator',
        experienceType: getDigitalExperienceType(itemMeta),
        packageFileName: digitalDelivery.packageFileName || '',
        packageSizeBytes: Number(digitalDelivery.packageSizeBytes || 0),
        licenseType: asText(itemMeta.licenseType || ''),
        licenseDescription: asText(itemMeta.licenseDescription || ''),
        platforms: toStringArray(gameDetails.platforms || digitalDelivery.supportedPlatforms),
        genres: toStringArray(gameDetails.genres),
        scanStatus: asText(digitalDelivery?.scan?.status || 'pending') || 'pending',
        scanSummary: asText(digitalDelivery?.scan?.summary || ''),
        downloadCount: Number(digitalDelivery.downloadCount || 0)
      };
    })
    .filter(Boolean);
};

const resolveLibraryDownload = async ({ supabase, ownerUserId, orderItemId, privateUploadsRoot }) => {
  const { data: orderItemRow, error } = await supabase
    .from('order_items')
    .select('id,order_id,item_id,items(title,metadata),orders!inner(id,buyer_id,status)')
    .eq('id', orderItemId)
    .maybeSingle();
  if (error) throw error;
  if (!orderItemRow) throw new Error('Digital order item not found.');

  if (String(orderItemRow.orders?.buyer_id || '') !== String(ownerUserId)) {
    throw new Error('You do not have access to this digital purchase.');
  }

  if (asText(orderItemRow.orders?.status).toLowerCase() === 'cancelled') {
    throw new Error('Cancelled orders cannot download packages.');
  }

  const itemMetadata = jsonObject(orderItemRow.items?.metadata);
  const digitalDelivery = jsonObject(itemMetadata.digitalDelivery);
  const assetId = asText(digitalDelivery.packageAssetId);
  if (!assetId) throw new Error('No package is attached to this listing.');

  const assetRow = await readPrivateAssetRow(supabase, assetId);
  if (!assetRow) throw new Error('Package asset could not be found.');
  if (String(assetRow.storage_driver || '') !== PRIVATE_STORAGE_DRIVER) {
    throw new Error('Package is not stored in private delivery mode.');
  }

  const relativePath = asText(assetRow.storage_path).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.resolve(privateUploadsRoot, relativePath);
  if (!fullPath.startsWith(path.resolve(privateUploadsRoot))) {
    throw new Error('Package path is invalid.');
  }
  if (!fs.existsSync(fullPath)) {
    throw new Error('Package file is no longer available on disk.');
  }

  const nextMetadata = {
    ...itemMetadata,
    digitalDelivery: {
      ...digitalDelivery,
      downloadCount: Number(digitalDelivery.downloadCount || 0) + 1
    }
  };
  try {
    await supabase
      .from('items')
      .update({ metadata: nextMetadata })
      .eq('id', orderItemRow.item_id);
  } catch {
    // Downloads should not fail just because a counter update could not be persisted.
  }

  return {
    filePath: fullPath,
    fileName: sanitizeDownloadFileName(assetRow.file_name || `${sanitizeBaseName(orderItemRow.items?.title || 'download')}.zip`),
    mimeType: 'application/zip',
    title: orderItemRow.items?.title || itemMetadata.title || 'Digital package',
    scanStatus: asText(digitalDelivery?.scan?.status || '')
  };
};

const upsertDigitalListing = async ({
  supabase,
  ownerUserId,
  body,
  privateUploadsRoot,
  existingItem = null,
  writeAuditLog
}) => {
  const isNew = !existingItem;
  const placeholderCategory = asText(body.category || 'Digital Products');
  const placeholderCategoryId = await tryResolveCategoryId(supabase, placeholderCategory);

  let itemRow = existingItem;
  if (!itemRow) {
    const { data, error } = await supabase
      .from('items')
      .insert({
        seller_id: ownerUserId,
        category_id: placeholderCategoryId,
        title: asText(body.title || 'Untitled digital listing') || 'Untitled digital listing',
        description: asText(body.description || ''),
        listing_type: 'sale',
        status: 'draft',
        condition: 'new',
        brand: asText(body.publisher || '') || null,
        currency: 'USD',
        sale_price: parseMoney(body.salePrice || 0),
        rental_price: null,
        auction_start_price: null,
        auction_reserve_price: null,
        auction_end_at: null,
        stock: 9999,
        is_featured: false,
        is_verified: false,
        metadata: {
          title: asText(body.title || ''),
          description: asText(body.description || ''),
          productType: 'digital',
          itemType: 'digital'
        }
      })
      .select('*')
      .single();
    if (error) throw error;
    itemRow = data;
  }

  try {
    const existingMetadata = jsonObject(itemRow.metadata);
    const packageBase64 = asText(body.packageBase64);
    const packageFileName = asText(body.packageFileName || existingMetadata?.digitalDelivery?.packageFileName || '');
    const reusePackageAssetId = asText(body.reusePackageAssetId);
    const requestedExperienceType = asText(body.experienceType || existingMetadata.experienceType).toLowerCase();
    const experienceType = requestedExperienceType === 'game' ? 'game' : 'digital';

    let packageAsset = null;
    let scan = null;

    if (packageBase64) {
      const created = await createPrivateAsset({
        supabase,
        privateUploadsRoot,
        ownerUserId,
        itemId: itemRow.id,
        experienceType,
        packageFileName: packageFileName || `${sanitizeBaseName(itemRow.title || 'package')}.zip`,
        base64Data: packageBase64
      });
      packageAsset = created.asset;
      scan = created.scan;
    } else if (reusePackageAssetId && reusePackageAssetId !== existingMetadata?.digitalDelivery?.packageAssetId) {
      const cloned = await clonePrivateAsset({
        supabase,
        sourceAssetId: reusePackageAssetId,
        ownerUserId,
        itemId: itemRow.id
      });
      packageAsset = cloned.asset;
      scan = cloned.scan;
    } else if (existingMetadata?.digitalDelivery?.packageAssetId) {
      packageAsset = await readPrivateAssetRow(supabase, existingMetadata.digitalDelivery.packageAssetId);
      scan = existingMetadata?.digitalDelivery?.scan || jsonObject(packageAsset?.metadata).scan || null;
    }

    const next = await buildListingPayload({
      supabase,
      body,
      existingItem: itemRow,
      ownerUserId,
      packageAsset,
      scan
    });

    const { data: updatedItem, error: updateError } = await supabase
      .from('items')
      .update(next.itemPayload)
      .eq('id', itemRow.id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    await writeItemImages(supabase, itemRow.id, next.imageUrls);
    await writeAuditLog?.({
      actorUserId: ownerUserId,
      action: isNew ? 'digital_listing_created' : 'digital_listing_updated',
      entityType: 'item',
      entityId: itemRow.id,
      details: {
        experienceType: next.experienceType,
        status: next.listingStatus,
        scanStatus: scan?.status || next.metadata?.digitalDelivery?.scan?.status || 'unknown'
      }
    });

    return {
      item: updatedItem,
      scan: scan || next.metadata?.digitalDelivery?.scan || null,
      status: next.listingStatus
    };
  } catch (error) {
    if (isNew && itemRow?.id) {
      await tryDeleteDraftArtifacts(supabase, itemRow.id);
    }
    throw error;
  }
};

const registerDigitalMarketplaceRoutes = ({
  app,
  supabase,
  requireAuth,
  getUserContext,
  writeAuditLog,
  uploadsRoot
}) => {
  const privateUploadsRoot = ensureDirectory(path.resolve(uploadsRoot, '..', 'private-marketplace'));

  app.get('/marketplace/games/discovery', async (_req, res) => {
    try {
      const payload = await collectDiscoveryPayload({ supabase });
      return res.json(payload);
    } catch (error) {
      console.error('game discovery failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load game discovery.' });
    }
  });

  app.get('/marketplace/digital/me/dashboard', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }
      const dashboard = await collectDashboardListings({
        supabase,
        ownerUserId: context.user.id
      });
      return res.json(dashboard);
    } catch (error) {
      console.error('digital dashboard failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load digital dashboard.' });
    }
  });

  app.post('/marketplace/digital/listings', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const result = await upsertDigitalListing({
        supabase,
        ownerUserId: context.user.id,
        body: req.body || {},
        privateUploadsRoot,
        writeAuditLog
      });
      return res.status(201).json(result);
    } catch (error) {
      const scan = error?.scan || null;
      return res.status(400).json({
        error: error?.message || 'Unable to create digital listing.',
        scan
      });
    }
  });

  app.patch('/marketplace/digital/listings/:id', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const listingId = asText(req.params.id);
      if (!uuidLike(listingId)) {
        return res.status(400).json({ error: 'Listing id must be a UUID.' });
      }

      const { data: existingItem, error: lookupError } = await supabase
        .from('items')
        .select('*')
        .eq('id', listingId)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existingItem) {
        return res.status(404).json({ error: 'Digital listing not found.' });
      }
      if (String(existingItem.seller_id || '') !== String(context.user.id)) {
        return res.status(403).json({ error: 'You can only edit your own digital listings.' });
      }

      const result = await upsertDigitalListing({
        supabase,
        ownerUserId: context.user.id,
        body: req.body || {},
        privateUploadsRoot,
        existingItem,
        writeAuditLog
      });
      return res.json(result);
    } catch (error) {
      const scan = error?.scan || null;
      return res.status(400).json({
        error: error?.message || 'Unable to update digital listing.',
        scan
      });
    }
  });

  app.get('/marketplace/digital/library', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }
      const entries = await loadDigitalLibraryEntries({
        supabase,
        ownerUserId: context.user.id
      });
      return res.json({ entries });
    } catch (error) {
      console.error('digital library failed:', error);
      return res.status(500).json({ error: error?.message || 'Unable to load digital library.' });
    }
  });

  app.get('/marketplace/digital/library/download/:orderItemId', requireAuth, async (req, res) => {
    try {
      if (!getUserContext) {
        return res.status(500).json({ error: 'Server misconfigured.' });
      }
      const context = await getUserContext(req);
      if (context.error) {
        return res.status(400).json({ error: context.error.message || 'Unable to resolve user.' });
      }

      const orderItemId = asText(req.params.orderItemId);
      if (!uuidLike(orderItemId)) {
        return res.status(400).json({ error: 'orderItemId must be a UUID.' });
      }

      const download = await resolveLibraryDownload({
        supabase,
        ownerUserId: context.user.id,
        orderItemId,
        privateUploadsRoot
      });

      res.setHeader('Content-Type', download.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${download.fileName.replace(/"/g, '')}"`
      );
      if (download.scanStatus) {
        res.setHeader('X-Digital-Scan-Status', download.scanStatus);
      }

      const stream = fs.createReadStream(download.filePath);
      stream.on('error', (error) => {
        if (!res.headersSent) {
          res.status(500).json({ error: error?.message || 'Unable to stream package.' });
        } else {
          res.destroy(error);
        }
      });
      stream.pipe(res);
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Unable to download package.' });
    }
  });
};

export default registerDigitalMarketplaceRoutes;
