import addToBasketAnimation from '../avatar icons and more icons/Add_to_basket_20260221173054.gif';
import addToBasketAltAnimation from '../avatar icons and more icons/Add_to_basket_20260221172350.gif';
import addToCartButtonAnimation from '../avatar icons and more icons/Add_to_Cart_Button_20260221173041.gif';
import noFileFoundAnimation from '../avatar icons and more icons/No_file_found_20260221172945.gif';
import noResultsAnimation from '../avatar icons and more icons/no_result_found_20260221172922.gif';
import femaleAvatarIcon from '../avatar icons and more icons/female-avatar-girl-face-woman-user-2-svgrepo-com.svg';
import maleAvatarIcon from '../avatar icons and more icons/male-avatar-boy-face-man-user-5-svgrepo-com.svg';

const homeAnimation = 'https://lottie.host/91669ebd-2dc2-455c-ae77-4f205a41bb57/oRqsplj6BH.lottie';
const loadingAnimation = 'https://lottie.host/6abaaf1c-cc86-4e28-90f7-82ef8e7a47a8/UlvuzYYQFe.lottie';
const userReviewsAnimation = 'https://lottie.host/63208457-a747-427d-896a-3db682365537/5bfJrglSSI.lottie';
const feedbackStoreAnimation = 'https://lottie.host/6e3238e9-36aa-4eed-b3fb-d3bc9b96394a/OgkqGSv97s.lottie';
const error404Animation = 'https://lottie.host/8c99f45a-85a4-46b7-8829-30073e8861f3/FHpf9jqufz.lottie';
const nothingAnimation = 'https://lottie.host/310a3878-b528-4893-b91c-60c11364c01e/7FOxYhaYYS.lottie';
const noChatStartedAnimation = 'https://lottie.host/53fab7bf-1543-4649-b476-7fc8ce74d7db/iPElC75Kg4.lottie';
const sendMessageEnterAnimation = 'https://lottie.host/2aa38f69-cdf7-4f52-a0f5-b260f0a04fea/jp9v48mxWS.lottie';
const incomingMessageOverlayAnimation = 'https://lottie.host/2a91de77-dbec-43cf-80fb-431b25d440b6/qKEFAcWbsC.lottie';

export const uiLottieAnimations = {
  addToCartSingle: addToBasketAltAnimation,
  addToCartMultiple: addToCartButtonAnimation,
  addToCartMultipleAlt: addToBasketAnimation,
  error404: error404Animation,
  feedbackStore: feedbackStoreAnimation,
  home: homeAnimation,
  loader: loadingAnimation,
  noFileFound: noFileFoundAnimation,
  noChatStarted: noChatStartedAnimation,
  incomingMessageOverlay: incomingMessageOverlayAnimation,
  noResults: noResultsAnimation,
  nothing: nothingAnimation,
  sendMessageEnter: sendMessageEnterAnimation,
  userReviews: userReviewsAnimation
} as const;

export const authAvatarIcons = {
  male: maleAvatarIcon,
  female: femaleAvatarIcon
} as const;

export type AuthAvatarGender = keyof typeof authAvatarIcons;
