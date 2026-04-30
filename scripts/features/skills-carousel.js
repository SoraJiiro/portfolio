import { setupVerticalTextCarousel } from "./vertical-text-carousel.js";

const LANGUAGE_ITEMS = [
  'HTML <i class="fa-brands fa-html5"></i>.',
  'CSS <i class="fa-brands fa-css3-alt"></i>.',
  'JavaScript <i class="fa-brands fa-js"></i>.',
  'XML <i class="fa-solid fa-code"></i>.',
  'JSON <i class="fa-solid fa-file-code"></i>.',
  'PHP <i class="fa-brands fa-php"></i>.',
  'SQL <i class="fa-solid fa-database"></i>.',
  'Java <i class="fa-brands fa-java"></i>.',
  'Python <i class="fa-brands fa-python"></i>.',
  'Node <i class="fa-brands fa-node-js"></i>.',
  'JQuery <i class="fa-solid fa-code"></i>.',
];

const TOOL_ITEMS = [
  'VS Code <i class="fa-solid fa-code"></i>.',
  'Git & GitHub <i class="fa-brands fa-git-alt"></i>.',
  'Bootstrap <i class="fa-brands fa-bootstrap"></i>.',
  'Tailwind CSS <i class="fa-solid fa-wind"></i>.',
  'Postman <i class="fa-solid fa-paper-plane"></i>.',
  'PostgreSQL <i class="fa-solid fa-database"></i>.',
  'phpMyAdmin <i class="fa-solid fa-server"></i>.',
  'Bash <i class="fa-solid fa-terminal"></i>.',
  'AI Tools <i class="fa-solid fa-robot"></i>.',
  '<i class="ajax-icon"></i>',
];

export function setupLanguageCarousel() {
  setupVerticalTextCarousel("langages", LANGUAGE_ITEMS);
}

export function setupToolsCarousel() {
  setupVerticalTextCarousel("tools", TOOL_ITEMS);
}
