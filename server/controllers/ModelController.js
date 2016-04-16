module.exports = function(sequelize)
{
	var models =
	{
		Track: require("../models/TrackModel.js")(sequelize),
		Content: require("../models/ContentModel.js")(sequelize),
		Playlist: require("../models/PlaylistModel.js")(sequelize),
		Item: require("../models/ItemModel.js")(sequelize),
		Relation: require("../models/RelationModel.js")(sequelize),
		TrackEdit: require("../models/TrackEditModel.js")(sequelize),
		ContentLink: require("../models/ContentLinkModel.js")(sequelize),
		RelationVote: require("../models/RelationVoteModel.js")(sequelize),
		RelationFlag: require("../models/RelationFlagModel.js")(sequelize),
	};

	return models;
}
