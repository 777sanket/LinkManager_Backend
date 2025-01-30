router.get("/", authMiddleware, async (req, res) => {
  try {
    // Extract query parameters for pagination and filtering
    const {
      page = 1,
      limit = 10,
      sortBy = "dateCreated",
      order = "desc",
      status,
    } = req.query;

    // Build query filters
    const filters = { user: req.user.id };
    if (status === "active" || status === "inactive") {
      filters.expirationTime =
        status === "active" ? { $gt: new Date() } : { $lte: new Date() };
    }

    // Fetch paginated and sorted links
    const links = await Links.find(filters)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Total number of links for pagination metadata
    const totalLinks = await Links.countDocuments(filters);

    // Map through the links and add the dynamic status
    const responseLinks = links.map((link) => ({
      id: link._id,
      originalLink: link.originalLink,
      shortenedLink: link.shortenedLink,
      remark: link.remark,
      expirationTime: link.expirationTime,
      dateCreated: link.dateCreated,
      clicks: link.clicks,
      status: getLinkStatus(link) ? "active" : "inactive", // Dynamic status
    }));

    res.status(200).json({
      message: "Links retrieved successfully",
      links: responseLinks,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalLinks / limit),
        totalLinks,
      },
    });
  } catch (error) {
    console.error("Error retrieving links:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});
