var Article =
{
	TRACK_NAMING_GUIDELINES: 3,
	cache: {},
};

// Display an article in the article overlay
Article.show = function(articleId)
{
	var cachedArticle = Article.cache[articleId];

	if(cachedArticle)
	{
		Article.setContents(cachedArticle);
		return;
	}

	Article.request(articleId);
}

// Request an article from the server
Article.request = function(articleId)
{
	var Toast = require("./Toast.js");

	$.ajax
	({
		url: "/articles/" + articleId,
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var articleHtml = response;

			Article.setContents(articleHtml);

			Article.cache[articleId] = articleHtml;
		},
		error: Toast.onRequestError,
	});
}

// Update the article overlay with the contents provided
Article.setContents = function(articleHtml)
{
	// Update the article overlay
	$("#article")
		.empty()
		.append(
			$("<div>")
				.attr("id", "article-contents")
				.html(articleHtml)
		);

	// Display the article overlay
	$("#article")
		.hide()
		.removeClass("hidden")
		.fadeIn(200);

	// Clear the toast
	var Toast = require("./Toast.js");
	Toast.clear();

	$("body").bind("mousemove", Article.onDocumentMouseMove);
}

// Creates an article view click handler on a link
Article.addLink = function($link, articleId)
{
	$link
		.data("articleId", articleId)
		.click(Article.onLinkClick);
}

// Returns true if the article overlay is visible
Article.isActive = function()
{
	return !$("#article").is(".hidden");
}

// Hide the article and clear the overlay
Article.destroy = function()
{
	$("#article").fadeOut(200, function onArticleFadeOut()
	{
		$(this).addClass("hidden");
		$("#article").empty();
	});

	$("body").unbind("mousemove", Article.onDocumentMouseMove);
	$("#overlay").removeClass("transparent");
}

// Called upon clicking the link handler
Article.onLinkClick = function(e)
{
	e.preventDefault();

	var articleId = $(this).data("articleId");

	if( Article.isActive() )
		return;

	Article.show(articleId);
};

// Called when the mouse is moved during an article view
Article.onDocumentMouseMove = function()
{
	$("#article").toggleClass("transparent",
		( $("#article:hover").length == 1 &&
			$("#article-contents:hover").length == 0 )
	);
}

// Called upon clicking the article overlay
Article.onClick = function(event)
{
	// The click wasn't outside the contents
	if(event.target != this)
		return;

	Article.destroy();
}

Article.init = function()
{
	$("#article")	.click(Article.onClick);
}

module.exports = Article;
