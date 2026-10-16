const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

// 24 hex characters. (mongoose.isValidObjectId also accepts any 12-char string.)
const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

module.exports = { isNonEmptyString, isObjectId };
