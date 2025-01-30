/**
 * Utility Function: Get the Device Type and User Device Details
 * @param {Object} req - Express request object
 * @returns {Object} - Device type and user device details
 */
const getUserDeviceInfo = (req) => {
  const userAgent = req.headers["user-agent"];
  if (!userAgent) {
    return { deviceType: "Unknown", userDevice: "Unknown" };
  }

  let deviceType = "Desktop"; // Default to Desktop
  let userDevice = "Unknown";

  // Determine Device Type and User Device
  if (userAgent.includes("Mobile")) {
    deviceType = "Mobile";
    if (userAgent.includes("Android")) {
      userDevice = "Android";
    } else if (userAgent.includes("iPhone")) {
      userDevice = "iOS";
    } else {
      userDevice = "Other Mobile";
    }
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    deviceType = "Tablet";
    if (userAgent.includes("Chrome")) {
      userDevice = "Chrome";
    } else if (userAgent.includes("Safari")) {
      userDevice = "Safari";
    } else if (userAgent.includes("Firefox")) {
      userDevice = "Firefox";
    } else {
      userDevice = "Other Browser";
    }
  } else {
    // Desktop Case
    if (userAgent.includes("Chrome")) {
      userDevice = "Chrome";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      userDevice = "Safari";
    } else if (userAgent.includes("Firefox")) {
      userDevice = "Firefox";
    } else if (userAgent.includes("Edge")) {
      userDevice = "Edge";
    } else {
      userDevice = "Other Browser";
    }
  }

  return { deviceType, userDevice };
};

module.exports = getUserDeviceInfo;
