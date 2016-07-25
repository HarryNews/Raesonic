module.exports = function(sequelize)
{
	var models =
	{
		User: require("../models/UserModel.js")(sequelize),
		Track: require("../models/TrackModel.js")(sequelize),
		Content: require("../models/ContentModel.js")(sequelize),
		Playlist: require("../models/PlaylistModel.js")(sequelize),
		Item: require("../models/ItemModel.js")(sequelize),

		FavoritePlaylist: require("../models/FavoritePlaylistModel.js")(sequelize),

		Relation: require("../models/RelationModel.js")(sequelize),
		RelationVote: require("../models/RelationVoteModel.js")(sequelize),
		RelationFlag: require("../models/RelationFlagModel.js")(sequelize),

		TrackEdit: require("../models/TrackEditModel.js")(sequelize),
		TrackEditFlag: require("../models/TrackEditFlagModel.js")(sequelize),

		ContentLink: require("../models/ContentLinkModel.js")(sequelize),
		ContentLinkFlag: require("../models/ContentLinkFlagModel.js")(sequelize),
	};

	return models;
}
