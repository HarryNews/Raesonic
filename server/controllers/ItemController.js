module.exports = function(core)
{
	var ItemController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Item = sequelize.models.Item;

	// Remove item from the playlist
	ItemController.removeItem = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });
		
		var PlaylistController = core.controllers.Playlist;

		PlaylistController.verifyOwnership(req.user,
			PlaylistController.BY_ITEMID, req.params.itemId, res,
		function onConfirm(playlist)
		{
			// User is the playlist owner, delete the item
			sequelize.transaction(function(tr)
			{
				return Item.findOne
				({ 
					attributes: ["playlistPosition"],
					where: { itemId : req.params.itemId }
				})
				.then(function(toDelete)
				{
					if(!toDelete)
						throw new Error("No such item exists for deletion.");

					return Item.update(
						{ playlistPosition: sequelize.literal("playlistPosition - 1") },
						{ 
							where: {
								playlistId: playlist.playlistId,
								playlistPosition: { $gt: toDelete.playlistPosition }
							},
							transaction: tr
						}
					)
					.then(function()
					{

						return Item.destroy
						({
							where: { itemId: req.params.itemId },
							transaction: tr
						})
						.then(function(amount)
						{
							if(amount < 1)
								throw new Error("no rows deleted");
							
							return playlist.decrement("count", { transaction: tr });
						});
					});
				});
			})
			.then(function()
			{
				res.json( [] );
			})
			.catch(function(err)
			{
				return res.status(500).json({ errors: ["internal error"] });
			});
		});
	}

	ItemController.init = function()
	{
		app.delete("/items/:itemId(\\d+)",
			ItemController.removeItem);
	}

	return ItemController;
}
