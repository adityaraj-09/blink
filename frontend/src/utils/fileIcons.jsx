import {
  FileText,
  FileCode,
  FileJson,
  Image,
  Film,
  FileArchive,
  File,
  Settings,
  Database,
  Lock,
  Package,
  Folder,
  FolderOpen
} from 'lucide-react';

// Map file extensions to icons
const extensionIconMap = {
  // JavaScript/TypeScript
  js: "/icons/javascript.svg",
  jsx: "/icons/react.svg",
  ts: "/icons/typescript.svg",
  tsx: "/icons/typescript.svg",
  mjs: "/icons/javascript.svg",
  cjs: "/icons/javascript.svg",

  // Web
  html: "/icons/html.svg",
  htm: "/icons/html.svg",
  css: "/icons/css.svg",
  scss: "/icons/css.svg",
  sass: "/icons/css.svg",
  less: "/icons/css.svg",
  vue: "/icons/vue.svg",
  svelte: "/icons/svelte.svg",

  // JSON/Config
  json: "/icons/json.svg",
  jsonc: FileJson,
  yaml: "/icons/yaml.svg",
  yml: "/icons/yaml.svg",
  toml: "/icons/toml.svg",
  xml: "/icons/xml.svg",

  // Markdown/Text
  md: "/icons/markdown.svg",
  mdx: "/icons/markdown.svg",
  txt: '/icons/document.svg',
  rst: '/icons/tex.svg',

  // Programming Languages
  py: "/icons/python.svg",
  java: "/icons/java.svg",
  c: "/icons/c.svg",
  cpp: "/icons/cpp.svg",
  cc: "/icons/cpp.svg",
  h: "/icons/h.svg",
  hpp: "/icons/hpp.svg",
  cs: "/icons/csharp.svg",
  go: "/icons/go.svg",
  rs: "/icons/rust.svg",
  rb: "/icons/ruby.svg",
  php: "/icons/php.svg",
  swift: "/icons/swift.svg",
  kt: "/icons/kotlin.svg",
  scala: "/icons/scala.svg",
  r: "/icons/r.svg",
  lua: "/icons/lua.svg",
  pl: "/icons/perl.svg",
  sh: "/icons/bash.svg",
  bash: "/icons/bash.svg",
  zsh: "/icons/zsh.svg",
  fish: "/icons/fish.svg",

  // Images
  png: "/icons/image.svg",
  jpg: "/icons/image.svg",
  jpeg: "/icons/image.svg",
  gif: "/icons/image.svg",
  svg: "/icons/image.svg",
  webp: "/icons/image.svg",
  ico: "/icons/image.svg",
  bmp: "/icons/image.svg",

  // Videos
  mp4: "/icons/video.svg",
  avi: "/icons/video.svg",
  mov: "/icons/video.svg",
  wmv: "/icons/video.svg",
  flv: "/icons/video.svg",
  webm: "/icons/video.svg",

  // Archives
  zip: "/icons/archive.svg",
  rar: "/icons/archive.svg",
  '7z': "/icons/archive.svg",
  tar: "/icons/archive.svg",
  gz: "/icons/archive.svg",

  // Config files
  env: "/icons/settings.svg",
  config: "/icons/settings.svg",
  conf: "/icons/settings.svg",
  ini: "/icons/settings.svg",
  cfg: "/icons/settings.svg",

  // Database
  sql: "/icons/database.svg",
  db: "/icons/database.svg",
  sqlite: "/icons/database.svg",

  // Security
  pem: "/icons/lock.svg",
  key: "/icons/lock.svg",
  cert: "/icons/lock.svg",
  crt: "/icons/lock.svg",





};



export const getFileIcon = (filePath) => {
  if (!filePath) return File;

  // Check full filename first
  const filename = filePath.split('/').pop();


  // Check extension
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension && extensionIconMap[extension]) {
    return extensionIconMap[extension];
  }

  return File;
};

export const getFolderIcon = (isOpen) => {
  return isOpen ? FolderOpen : Folder;
};

// Get color for file type
export const getFileColor = (filePath) => {
  if (!filePath) return 'text-gray-400';

  const filename = filePath.split('/').pop();
  const extension = filename.split('.').pop()?.toLowerCase();

  const colorMap = {
    // JavaScript/TypeScript
    js: 'text-yellow-400',
    jsx: 'text-yellow-400',
    ts: 'text-blue-400',
    tsx: 'text-blue-400',

    // Web
    html: 'text-orange-400',
    css: 'text-blue-300',
    scss: 'text-pink-400',

    // JSON
    json: 'text-yellow-300',
    yaml: 'text-purple-400',
    yml: 'text-purple-400',

    // Markdown
    md: 'text-blue-200',

    // Python
    py: 'text-blue-500',

    // Other languages
    java: 'text-red-400',
    go: 'text-cyan-400',
    rs: 'text-orange-500',
    rb: 'text-red-500',
    php: 'text-purple-500',

    // Images
    png: 'text-green-400',
    jpg: 'text-green-400',
    svg: 'text-yellow-500',
  };

  return colorMap[extension] || 'text-gray-400';
};
