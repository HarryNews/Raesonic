module.exports = function(app, sequelize)
{
	var ItemController = {};

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
				return res.status(500).json({ error: true });

			res.json( [] );
		});
	}

	app
		.route("/items/:itemId(\\d+)")
			.delete(ItemController.removeItem);

	return ItemController;
}
