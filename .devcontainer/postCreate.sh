#!/bin/sh

set -eu

MAGICMIRROR_PATH="/opt/magic_mirror"
MODULE_DIR="$(pwd)"
MODULE_NAME="$(basename \"$MODULE_DIR\")"

# Some modules/tools assume the default MagicMirror path without underscore.
if [ ! -e "/opt/magicmirror" ]; then
  ln -s "/opt/magic_mirror" "/opt/magicmirror" || true
fi#!/bin/sh

set -eu

MAGICMIRROR_PATH="/opt/magic_mirror"
MODULE_DIR="$(pwd)"
MODULE_NAME="$(basename \"$MODULE_DIR\")"

# Some modules/tools assume the default MagicMirror path without underscore.
if [ ! -e "/opt/magicmirror" ]; then
  ln -s "/opt/magic_mirror" "/opt/magicmirror" || true
fi

mkdir -p "${MAGICMIRROR_PATH}/config" "${MAGICMIRROR_PATH}/css"

if [ ! -f "${MAGICMIRROR_PATH}/config/config.js" ]; then
  cat >"${MAGICMIRROR_PATH}/config/config.js" <<'EOF'
let config = {
  address: "0.0.0.0",
  port: 8080,
  basePath: "/",
  ipWhitelist: [],
  useHttps: false,
  language: "en",
  timeFormat: 24,
  units: "metric",
  modules: [
    { module: "alert" },
    { module: "clock", position: "top_left" },
    { module: "__MODULE_NAME__", position: "top_right", config: {} }
  ]
};

if (typeof module !== "undefined") {
  module.exports = config;
}
EOF

  sed -i "s/__MODULE_NAME__/${MODULE_NAME}/g" "${MAGICMIRROR_PATH}/config/config.js"
else
  echo "config.js already exists at ${MAGICMIRROR_PATH}/config/config.js — leaving unchanged"
fi

if [ ! -f "${MAGICMIRROR_PATH}/css/custom.css" ]; then
  printf "/* custom.css (devcontainer) */\n" >"${MAGICMIRROR_PATH}/css/custom.css"
fi

if [ -f "${MODULE_DIR}/package.json" ]; then
  npm install
fi

# Make root config and custom.css visible in this module workspace (editor convenience)
# Create safe symlinks with a `.link` suffix so they don't interfere with runtime.
if [ ! -e "${MODULE_DIR}/config.js.link" ]; then
  if [ -f "/opt/magic_mirror/devcontainer/config.js" ]; then
    ln -sf "/opt/magic_mirror/devcontainer/config.js" "${MODULE_DIR}/config.js.link" || true
  elif [ -f "/opt/magic_mirror/config/config.js" ]; then
    ln -sf "/opt/magic_mirror/config/config.js" "${MODULE_DIR}/config.js.link" || true
  fi
fi

if [ ! -e "${MODULE_DIR}/custom.css.link" ]; then
  if [ -f "/opt/magic_mirror/devcontainer/custom.css" ]; then
    ln -sf "/opt/magic_mirror/devcontainer/custom.css" "${MODULE_DIR}/custom.css.link" || true
  elif [ -f "/opt/magic_mirror/css/custom.css" ]; then
    ln -sf "/opt/magic_mirror/css/custom.css" "${MODULE_DIR}/custom.css.link" || true
  fi
fi
