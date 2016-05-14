var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// Track is a musical creation
	var Track = sequelize.define("Track",
	{
		trackId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		artist: Sequelize.STRING(50),
		title: Sequelize.STRING(50),
	});
	
	return Track;
}
