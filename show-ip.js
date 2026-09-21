// show-ip.js
const os = require("os");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        const port = process.env.PORT || "3000";
        console.log(`🔗 On Your Network: http://${iface.address}:${port}`);
        return;
      }
    }
  }
  console.log("⚠ Could not determine local IP.");
}

getLocalIP();
