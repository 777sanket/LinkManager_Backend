const express = require("express");
const Links = require("../models/links.schema");
const Analysis = require("../models/analysis.schema");
const getUserDeviceInfo = require("../utils/getDevice");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

//Redirect to the original link
router.get("/:shortenedLink", async (req, res) => {
  try {
    const { shortenedLink } = req.params;

    // Find the link by the shortened URL
    const link = await Links.findOne({
      shortenedLink: `${req.headers.host}/${shortenedLink}`,
    });

    if (!link) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Check if the link is active
    if (link.expirationTime && new Date() > new Date(link.expirationTime)) {
      return res.status(410).json({ error: "Link is inactive (expired)" });
    }

    // Increment the click count
    link.clicks += 1;
    await link.save();

    // Get device information
    const { deviceType, userDevice } = getUserDeviceInfo(req);

    // Create an analysis entry
    const analysis = new Analysis({
      user: link.user, // Owner of the link
      link: link._id,
      originalLink: link.originalLink,
      shortenedLink: link.shortenedLink,
      ipAddress:
        req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "Unknown",
      userDevice,
      deviceType,
    });

    await analysis.save();

    // Redirect to the original link
    res.redirect(link.originalLink);
  } catch (error) {
    console.error("Error accessing link:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//All links
router.get("/all/links", authMiddleware, async (req, res) => {
  try {
    // Extract query parameters
    const {
      page = 1,
      limit = 10,
      sortBy = "dateClicked",
      order = "desc", // Default to recent first
    } = req.query;

    // Filters for the logged-in user
    const filters = { user: req.user.id };

    // Fetch paginated and sorted analysis records
    const analyses = await Analysis.find(filters)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 }) // Sort by dateClicked
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Total number of records for pagination metadata
    const totalRecords = await Analysis.countDocuments(filters);

    // Format the response
    const formattedAnalyses = analyses.map((record) => ({
      id: record._id,
      date: new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(record.dateClicked)),
      originalLink: record.originalLink,
      shortLink: record.shortenedLink,
      ipAddress: record.ipAddress,
      userDevice: record.userDevice,
    }));

    res.status(200).json({
      message: "Analysis records retrieved successfully",
      analyses: formattedAnalyses,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching analysis records:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Total clicks
router.get("/clicks/total-clicks", authMiddleware, async (req, res) => {
  try {
    const totalClicks = await Analysis.countDocuments({ user: req.user.id });

    res.status(200).json({
      message: "Total clicks retrieved successfully",
      totalClicks,
    });
  } catch (error) {
    console.error("Error fetching total clicks:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Date wise clicks
router.get("/date/date-wise-clicks", authMiddleware, async (req, res) => {
  try {
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0); // Normalize to 00:00 UTC

    // Fetch raw click data
    const rawClicks = await Analysis.find({
      user: req.user.id,
    }).select("dateClicked");

    // Convert MongoDB Dates to IST Date Strings
    const clickData = rawClicks.map((entry) => {
      const dateIST = new Date(
        entry.dateClicked.getTime() + 5.5 * 60 * 60 * 1000
      ); // Convert UTC to IST
      return dateIST.toISOString().split("T")[0]; // Extract YYYY-MM-DD in IST
    });

    // Apply JavaScript Logic for Grouping
    let dateCounts = clickData.reduce((acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Convert dateCounts keys from `YYYY-MM-DD` → `DD-MM-YYYY`
    const formattedDateCounts = Object.keys(dateCounts).reduce((acc, key) => {
      const formattedKey = key.split("-").reverse().join("-"); // Convert YYYY-MM-DD to DD-MM-YYYY
      acc[formattedKey] = dateCounts[key];
      return acc;
    }, {});

    // Use dateCounts directly for clicksByDate
    let clicksByDate = Object.entries(formattedDateCounts)
      .map(([date, count]) => ({
        _id: date, // Already in DD-MM-YYYY format
        clicks: count,
      }))
      .sort(
        (a, b) =>
          new Date(b._id.split("-").reverse().join("-")) -
          new Date(a._id.split("-").reverse().join("-"))
      ); // Sort descending

    // Remove dates with 0 clicks & keep only the most recent 4 dates
    clicksByDate = clicksByDate.filter((entry) => entry.clicks > 0).slice(0, 4);

    res.status(200).json({
      message: "Date-wise clicks retrieved successfully",
      clicksByDate, // Now ordered correctly and filtered
      // dateCounts: formattedDateCounts, // Retains full date counts (useful for debugging)
    });
  } catch (error) {
    console.error("Error fetching date-wise clicks:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

//Device wise clicks
router.get("/device/device-wise-clicks", authMiddleware, async (req, res) => {
  try {
    // Fetch all clicks for the user
    const rawClicks = await Analysis.find({ user: req.user.id }).select(
      "deviceType"
    );

    // Initialize device counts to always include Desktop, Tablet, and Mobile
    const deviceCounts = { Desktop: 0, Tablet: 0, Mobile: 0 };

    // Count clicks per device type
    rawClicks.forEach((click) => {
      if (deviceCounts.hasOwnProperty(click.deviceType)) {
        deviceCounts[click.deviceType]++;
      }
    });

    // Convert object to array format for frontend
    const clicksByDevice = Object.entries(deviceCounts)
      .map(([deviceType, clicks]) => ({ deviceType, clicks }))
      .sort((a, b) => b.clicks - a.clicks); // Sort by highest clicks

    res.status(200).json({
      message: "Device-wise clicks retrieved successfully",
      clicksByDevice,
    });
  } catch (error) {
    console.error("Error fetching device-wise clicks:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
