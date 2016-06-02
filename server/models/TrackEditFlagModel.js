var Sequelize = require("sequelize");

module.exports = function(sequelize)
{
	// TrackEditFlag is created when a User flags TrackEdit as inappropriate
	var TrackEditFlag = sequelize.define("TrackEditFlag",
	{
		flagId: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
		reasonId: Sequelize.INTEGER(2),
		date: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		resolved: { type: Sequelize.INTEGER(1), defaultValue: 0 },
	});

	var TrackEdit = sequelize.models.TrackEdit;
	TrackEdit.hasMany(TrackEditFlag, { foreignKey: "editId", onDelete: "cascade" });
	TrackEditFlag.belongsTo(TrackEdit, { foreignKey: "editId" });
	
	var User = sequelize.models.User;
	User.hasMany(TrackEditFlag, { foreignKey: "userId" });
	TrackEditFlag.belongsTo(User, { foreignKey: "userId" });
	
	return TrackEditFlag;
}
