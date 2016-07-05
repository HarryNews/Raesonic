module.exports = function(core)
{
	var ArticleController =
	{
		ARTICLES:
		[
			"terms-of-service",
			"privacy-policy",
			"track-naming-guidelines",
		],
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var Item = sequelize.models.Item;

	// Retrieve article with the articleId specified
	ArticleController.getArticle = function(req, res)
	{
		var articleName =
			ArticleController.ARTICLES[req.params.articleId - 1];

		if(!articleName)
			return res.status(404).json({ errors: ["article not found"] });

		res.sendFile(articleName + ".html",
			{ root: __dirname + "../../../client/src/articles" });
	}

	ArticleController.init = function()
	{
		app.get("/articles/:articleId(\\d+)",
			ArticleController.getArticle);
	}

	return ArticleController;
}
