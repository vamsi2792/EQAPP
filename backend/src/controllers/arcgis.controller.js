const axios = require("axios");

exports.generateToken = async (req, res) => {
  try {
    // 🔍 Validate env variables
    if (
      !process.env.ARCGIS_USERNAME ||
      !process.env.ARCGIS_PASSWORD ||
      !process.env.ARCGIS_REFERER
    ) {
      return res.status(500).json({
        error: "Missing ArcGIS environment variables",
      });
    }

    // 📡 Call ArcGIS API
    const response = await axios.post(
      "https://www.arcgis.com/sharing/rest/generateToken",
      new URLSearchParams({
        username: process.env.ARCGIS_USERNAME,
        password: process.env.ARCGIS_PASSWORD,
        referer: process.env.ARCGIS_REFERER,
        f: "json",
        expiration: "60", // minutes
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // 🛑 Handle ArcGIS errors
    if (response.data.error) {
      console.error("ArcGIS Error:", response.data.error);

      return res.status(500).json({
        error: "ArcGIS token generation failed",
        details: response.data.error,
      });
    }

    // ✅ Success
    return res.json({
      token: response.data.token,
      expires: response.data.expires,
    });

  } catch (error) {
    console.error(
      "ArcGIS Token Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: "Failed to generate ArcGIS token",
    });
  }
};