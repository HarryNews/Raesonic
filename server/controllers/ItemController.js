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
		// todo: return error if not logged in
		// todo: include playlist and check user for ownership

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
	}

	app.route("/items/:itemId(\\d+)",
		ItemController.removeItem);

	return ItemController;
}
