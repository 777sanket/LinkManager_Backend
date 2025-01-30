/**
 * Utility Function: Check if a link is active
 * @param {Object} link - Link document
 * @returns {boolean} - True if the link is active, false otherwise
 */

const getLinkStatus = (link) => {
  if (!link.expirationTime) {
    return true; // Active if no expiration time is set
  }
  return new Date() < new Date(link.expirationTime); // Active if current time is before expirationTime
};

module.exports = getLinkStatus;
