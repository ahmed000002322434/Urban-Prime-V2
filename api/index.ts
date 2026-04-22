import express from 'express';
import serverApp from '../server/src/index.js';

const app = express();
app.use('/api', serverApp);

export default app;