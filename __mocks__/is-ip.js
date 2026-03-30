const net = require("net");

module.exports = {
  isIP: (value) => net.isIP(value) !== 0,
  isIPv4: (value) => net.isIP(value) === 4,
  isIPv6: (value) => net.isIP(value) === 6,
};