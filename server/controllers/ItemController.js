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
		
		var PlaylistController = core.controllers.Playlist;

		PlaylistController.verifyOwnership(req.user, PlaylistController.BY_ITEMID, req.params.itemId, res,
		function onConfirm()
		{
			// User is the playlist owner, delete the item
			Item.destroy
			({
				where: { itemId: req.params.itemId }
			})
			.then(function(amount)
			{
				// Haven't deleted any rows
				if(amount < 1)
					return res.status(500).json({ errors: ["internal error"] });

				res.json( [] );
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
