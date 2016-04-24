module.exports = function(app, sequelize)
{
	var ContentController = {};

	var Track = sequelize.models.Track;
	var Content = sequelize.models.Content;
	var Item = sequelize.models.Item;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;

	// Retrieve content linked with a track
	ContentController.getTrackContent = function(req, res)
	{
		Content.all
		({
			attributes: ["sourceId", "externalId"],
			limit: 20,
			include:
			[{
				model: Track,
				where: { trackId: req.params.trackId }
			}]
		})
		.then(function(content)
		{
			var response = [];

			for(var index in content)
			{
				response.push
				([
					content[index].sourceId,
					content[index].externalId
				]);
			}
			
			res.json(response);
		});
	}

	// Change content of the playlist item
	ContentController.setItemContent = function(req, res)
	{
		if(!req.body || !req.body.sourceId || !req.body.externalId)
			return res.status(500).json({ error: true });
		
		// todo: return error if not logged in
		// todo: include playlist and check user for ownership

		Content.findOne
		({
			attributes: ["contentId"],
			where:
			{
				sourceId: req.body.sourceId,
				externalId: req.body.externalId
			}
		})
		.then(function(content)
		{
			// Content doesn't exist, nothing to link item with
			if(!content)
				return res.status(500).json({ error: true });

			Item.update
			({
				contentId: content.contentId
			},
			{
				where: { itemId: req.params.itemId }
			})
			
			res.json( [] );
		});
	}

	// Find content by the itemId, and link it to the track with specified trackId
	ContentController.linkContent = function(itemId, trackId, res)
	{
		Content.findOne
		({
			attributes: ["contentId", "trackId"],
			include:
			[{
				model: Item,
				where: { itemId: itemId }
			}]
		})
		.then(function(content)
		{
			// Grab the current trackId before it's overwritten
			var previousTrackId = content.trackId;

			// Update trackId of the content
			Content.update
			({
				trackId: trackId
			},
			{
				where: { contentId: content.contentId }
			})
			.then(function()
			{
				// Remove the previously linked track if it has no references
				Relation.count
				({
					where:
					{
						$or:
						[
							{ trackId: previousTrackId },
							{ linkedId: previousTrackId }
						]
					}
				})
				.then(function(relationCount)
				{
					// Track has relations, keep it
					if(relationCount > 0)
						return;

					// Count content linked with the track
					Content.count
					({
						where: { trackId: previousTrackId }
					})
					.then(function(contentCount)
					{
						// Track is linked to a content, keep it
						if(contentCount > 0)
							return;

						var params = { where: { trackId: previousTrackId } };

						TrackEdit.destroy(params);
						ContentLink.destroy(params);
						Track.destroy(params);
					});
				});

				res.json(trackId);

				// todo: use actual user id
				ContentLink.create
				({
					trackId: trackId,
					userId: 1,
					contentId: content.contentId
				});
			});
		});
	}

	app
		.route("/tracks/:trackId(\\d+)/content")
			.get(ContentController.getTrackContent);

	app
		.route("/items/:itemId(\\d+)/content")
			.put(ContentController.setItemContent);

	return ContentController;
}
