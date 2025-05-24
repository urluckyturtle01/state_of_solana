// show-ip.js
const os = require("os");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`🔗 On Your Network: http://${iface.address}:3000`);
        return;
      }
    }
  }
  console.log("⚠ Could not determine local IP.");
}

getLocalIP();
