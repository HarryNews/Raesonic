scriptsLoaded = 0;

// Cookies
$.cookie.defaults.path = "/";
function loadCookie(name, defaultValue)
{
	var value = $.cookie(name);
	if(typeof value == "undefined") return defaultValue;
	return JSON.parse(value);
}
var volume = loadCookie("volume", 80);
var hd = loadCookie("hd", true);

// Variables
var itemStorage = [];
var lastVolume = volume;
var muted = false;

// YouTube API
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// YouTube Init
var youtubePlayer;
var youtubeReady = false;
function onYouTubeIframeAPIReady()
{
	youtubePlayer = new YT.Player("video-iframe",
	{
		width: "480",
		height: "270",
		playerVars:
		{
			"controls": 0,
			"iv_load_policy": 3,
			"rel": 0,
			"showinfo": 0
		},
		events:
		{
			"onReady": onPlayerReady,
			"onStateChange": onPlayerStateChange
		}
	});
}
function updateQuality()
{
	youtubePlayer.setPlaybackQuality(hd ? "hd720" : "large");
	if(hd) return $("#hd").removeClass("disabled");
	$("#hd").addClass("disabled");
}
function switchActiveItem(forward, manual)
{
	var $item = $(".item.active").closest(".item");
	$item = forward ? $item.next() : $item.prev();
	if($item.length < 1)
	{
		if(!manual) return;
		$item = forward ? $(".item:first") : $(".item:last");
	}
	$(":first-child", $item).click();
}
function onPlayerReady(event)
{
	youtubeReady = true;
	updateQuality();
	loaded();
}
function onPlayerStateChange(event)
{
	if(event.data != YT.PlayerState.PLAYING && event.data != YT.PlayerState.BUFFERING)
	{
		$("#pause").hide();
		$("#play").show();
		$("#seekbar-fill").finish();
		if(event.data == YT.PlayerState.ENDED) switchActiveItem(true);
		return;
	}
	$("#play").hide();
	$("#pause").show();
}

// SoundCloud Init
var soundcloudPlayer;
SC.initialize
({
	client_id: "2f8f0d3feaba4ed1c596902b225aad55"
});

// Raesonic Init
$(document).ready(function()
{
	// Misc
	var seeking = false;
	var changingVolume = false;
	var freeze = false;
	var mouseX = 0;
	$(document).mousemove(function(e)
	{
		mouseX = e.pageX;
	});
	$(document).mouseup(function()
	{
		if(typeof dragInterval == "undefined") return;
		clearInterval(dragInterval);
		if(changingVolume)
		{
			$.cookie("volume", Math.round(volume).toString());
			changingVolume = false;
			return;
		}
		if(!seeking) return;
		seeking = false;
		setTimeout(function() { freeze = false; }, 500);
		var seek = Math.min((mouseX - $("#seekbar").offset().left) / $("#seekbar").width(), 1);
		if(soundcloudPlayer)
		{
			if(!soundcloudPlayer.isPlaying()) soundcloudPlayer.play();
			soundcloudPlayer.seek(seek * soundcloudPlayer.options.duration, false);
			return;
		}
		youtubePlayer.seekTo(seek * youtubePlayer.getDuration(), true);
	});

	$("#video").hover(function()
	{
		$("#hd").stop(true).fadeIn(200);
	},
	function()
	{
		$("#hd").stop(true).delay(5000).fadeOut(2000);
	});

	$("#hd").click(function()
	{
		hd = !hd;
		$.cookie("hd", hd.toString());
		updateQuality();
	});

	// Retrieve Playlist
	$.ajax
	({
		// todo: use playlistId from current URL or user playlists
		url: "/playlists/1/",
		type: "GET",
		success: function(response)
		{
			if(response.error) return;
			var playlist = response[0];
			var items = response[1];
			$("#playlist-name").text(playlist[0]);
			setItems(items);
			updatePlaylistCounter(items.length);
		}
	});

	// Search
	$("#search").keyup(function(e)
	{
		var query = $(this).val();
		var length = query.length;
		if(e.keyCode != 13 || length < 3)
		{
			if(query.indexOf("http") == 0)
			{
				$("#search-clear").is(":visible") ? clearSearch(true) : $("#search-clear").fadeIn(200);
				return;
			}
			length ? $("#search-clear").fadeIn(200) : clearSearch();
			if(itemStorage.length) return;
			var count = 0;
			$(".item").each(function()
			{
				if(!length) return $(this).removeClass("hidden odd even");
				var hidden = true;
				$(this).children().slice(0, 2).each(function()
				{
					if($(this).text().toLowerCase().indexOf(query) != -1) hidden = false;
				});
				$(this).toggleClass("hidden", hidden);
				$(this).removeClass("odd even");
				if(hidden) return;
				(count % 2) ? $(this).addClass("even") : $(this).addClass("odd");
				count++;
			});
			$("#items").scrollTop(0);
			return;
		}
		var match = /(youtu.be\/|youtube.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&\"\'>]+)/.exec(query);
		if(match && match[5])
		{
			addContent(1, match[5]);
			return;
		}
		match = /^https?:\/\/(soundcloud.com|snd.sc)\/(.*)$/.exec(query);
		if(match && match[2])
		{
			SC.resolve(query).then(function(response)
			{
				addContent(2, response.id);
			});
			return;
		}
		$.ajax
		({
			url: "/search/" + encodeURIComponent(query).replace(/%20/g, "+") + "/",
			type: "GET",
			success: function(response)
			{
				if(response.error) return;
				var items = response;
				setItems(items, true);
			}
		});
	});

	function clearSearch(keepInput)
	{
		if(!keepInput)
		{
			$("#search").val("");
			$("#search-clear").hide();
		}
		$(".item").removeClass("hidden odd even active");
		if(!itemStorage.length) return;
		$("#items").empty();
		itemStorage.forEach(function($item)
		{
			$("#items").append($item.removeClass("hidden odd even active"));
		});
		itemStorage = [];
	}
	$("#search-clear").click(function() { clearSearch(); });

	function addContent(sourceId, externalId)
	{
		$.ajax
		({
			// todo: use active playlistId
			url: "/playlists/1/",
			type: "POST",
			data: { sourceId: sourceId, externalId: externalId },
			success: function(response)
			{
				if(response.error) return;
				var trackId = response[0];
				var artist = response[1];
				var title = response[2];
				var itemId = response[3];
				clearSearch();
				addItem(0, [trackId, artist, title, itemId, sourceId, externalId], true);
				$("#items").scrollTop(0);
				updatePlaylistCounter();
			}
		});
	}

	function requestContent(trackId, assignToItem, switchDirection)
	{
		$.ajax
		({
			url: "/tracks/" + trackId + "/content/",
			type: "GET",
			success: function(response)
			{
				var $item = $(".item.active");
				if(!$item.length) return;
				if(response.error) return $("#tab-content").data("content", []);
				$("#tab-content").data("content", response);
				setActiveTab("content");
				if(!assignToItem) return switchActiveContent(switchDirection);
				var nearest = response[0];
				if(!nearest) return;
				$item.data
				({
					"sourceId": nearest[0],
					"externalId": nearest[1]
				});
				$(":first-child", $item).click();
			}
		});
	}

	function setItems(items, store)
	{
		if(store && itemStorage.length < 1)
		{
			$(".item").each(function()
			{
				itemStorage.push($(this).detach());
			});
		}
		$("#items").empty();
		$.each(items, addItem);
		$("#items").scrollTop(0);
	}

	function addItem(itemId, item, prepend)
	{
		var $item = $("<div>").addClass("item");
		$item.append($("<div>").addClass("artist").html(item[1].replace(/&\+/g, "<span>&</span>")));
		$item.append($("<div>").addClass("title").html(item[2].replace(/\((.+)\)/g, "<span>$1</span>")));
		$item.append($("<div>").addClass("icon add fa fa-plus"));
		$item.append($("<div>").addClass("icon edit fa fa-pencil").click(editItem));
		$item.data("trackId", item[0]);
		if(item[3])
		{
			$item.data
			({
				"itemId": item[3],
				"sourceId": item[4],
				"externalId": item[5]
			});
		}
		$item.children().slice(0, 2).click(playItem);
		if(prepend)
		{
			$("#items").prepend($item);
			return;
		}
		$("#items").append($item);
	}

	function updatePlaylistCounter(amount)
	{
		$("#playlist-details").text((amount || $(".item").length) + " tracks");
	}

	function togglePlaybackState()
	{
		if($("#play").is(":visible")) return $("#play").click();
		$("#pause").click();
	}

	// Handlers
	function playItem()
	{
		$item = $(this).parent();
		if($item.is(".active")) return;
		$("#meta-artist").html($item.find(".artist").html());
		$("#meta-title").html($item.find(".title").html());
		$("#items .item").removeClass("active");
		$("#items").animate
		({
			scrollTop: Math.max($item.height() * ($item.siblings(":visible").addBack().index($item) - 1), 0)
		}, 500);
		if(soundcloudPlayer)
		{
			soundcloudPlayer.pause();
			soundcloudPlayer.dispose();
			soundcloudPlayer = null;
		}
		$("#seekbar-fill").stop(true, true).width(0);
		$("#current-time").text("00:00");
		$("#total-time").text("00:00");
		$("#tab-content").data("content", []);
		setContentSwitchEnabled(true);
		if(!$item.data("sourceId"))
		{
			return requestContent($item.data("trackId"), true);
		}
		$item.addClass("active");
		if($item.data("sourceId") == "1")
		{
			$("#cover").empty().hide();
			$("#video").show();
			var externalId = $item.data("externalId");
			youtubePlayer.loadVideoById(externalId);
			$("#content-image").attr("src", "http://img.youtube.com/vi/" + externalId + "/0.jpg");
			return;
		}
		if($item.data("sourceId") == "2")
		{
			if(youtubeReady)
			{
				youtubePlayer.stopVideo();
				youtubePlayer.clearVideo();
			}
			$("#video").hide();
			$("#cover").empty();
			var trackString = "/tracks/" + $item.data("externalId");
			SC.get(trackString).then(function(response)
			{
				var imageUrl = response.artwork_url || response.user.avatar_url;
				if(imageUrl)
				{
					$("#cover")
						.append($("<img>").attr("src", imageUrl.replace("large", "t500x500"))
						.addClass("back").click(togglePlaybackState)
					);
					$("#cover")
						.append($("<img>").attr("src", imageUrl.replace("large", "t300x300"))
						.addClass("front").click(togglePlaybackState)
					);
					$("#content-image").attr("src", imageUrl.replace("large", "t300x300"));
				}
				else
				{
					$("#content-image").attr("src", "");
				}
				$("#cover")
					.append($("<a>").attr({ "href": response.permalink_url, "target": "_blank" })
						.click(function()
						{
							$("#pause").click();
						})
					.append($("<img>").attr({ "src": "/img/soundcloud.png", "id": "soundcloud" }))
				);
				$("#cover")
					.append($("<a>").attr({ "href": response.user.permalink_url, "target": "_blank", "id": "creator" })
					.text(response.user.username).delay(5000).fadeOut(2000))
					.show(
				);
				$("#cover").unbind().hover(function()
				{
					$("#creator").stop(true).fadeIn(500);
				},
				function()
				{
					$("#creator").stop(true).delay(5000).fadeOut(2000);
				});
			});
			SC.stream(trackString).then(function(trackPlayer)
			{
				soundcloudPlayer = trackPlayer;
				soundcloudPlayer.play();
				soundcloudPlayer.setVolume(volume / 100);
				soundcloudPlayer.on("state-change", function(state)
				{
					if(state != "playing" && state != "loading" && state != "seeking")
					{
						$("#pause").hide();
						$("#play").show();
						$("#seekbar-fill").finish();
						if(state == "ended") switchActiveItem(true);
						return;
					}
					$("#play").hide();
					$("#pause").show();
				});
			});
			return;
		}
	}

	function editItem()
	{
		$item = $(this).parent();
		var trackId = $item.data("trackId");
		var itemId = $item.data("itemId");
		var artist = "";
		var title = "";
		function updateWindowButton()
		{
			var artistChanged = ($("#edit-artist").val() != artist);
			var titleChanged = ($("#edit-title").val() != title);
			if((trackId != -1) ? (artistChanged || titleChanged) : (artistChanged && titleChanged))
			{
				$("#window-button").text("SAVE").unbind().click(function()
				{
					renameItem(itemId, trackId, $("#edit-artist").val(), $("#edit-title").val(), artistChanged, titleChanged);
				});
				return;
			}
			if(!itemId) return $("#window-button").text("");
			$("#window-button").text("REMOVE").unbind().click(function()
			{
				removeItem(itemId);
			});
		}
		if(trackId != -1)
		{
			artist = $(":nth-child(1)", $item).html().replace(/<span>&amp;<\/span>/g, "&+");
			title = $(":nth-child(2)", $item).html().replace(/<span>(.+)<\/span>/g, "($1)");
		}
		$("#window")
			.empty()
			.append($("<div>").attr("id", "window-header").text("Edit track"))
			.append($("<input>").attr({ "id": "edit-artist", "type": "text", "maxlength": 50, "placeholder": "Artist" })
				.val(artist).keyup(updateWindowButton))
			.append($("<input>").attr({ "id": "edit-title", "type": "text", "maxlength": 50, "placeholder": "Title" })
				.val(title).keyup(updateWindowButton))
			.prepend($("<button>").attr("id", "window-button")
		);
		updateWindowButton();
		$("#overlay").hide().removeClass("hidden").fadeIn(200).unbind().click(function(e)
		{
			if(e.target != this) return;
			$(this).fadeOut(200, function()
			{
				$(this).addClass("hidden");
			});
		});
	}

	function removeItem(itemId)
	{
		$.ajax
		({
			url: "/items/" + itemId + "/",
			type: "DELETE",
			success: function(response)
			{
				if(response.error) return;
				var $item = $(".item").filterByData("itemId", itemId);
				if($item.is(".active")) switchActiveItem(true);
				$item.remove();
				updatePlaylistCounter();
				$("#overlay").click();
			}
		});
	}

	function renameItem(itemId, trackId, artist, title, artistChanged, titleChanged)
	{
		var tracksUrl = "/tracks/";
		if(trackId != -1) tracksUrl = tracksUrl + trackId + "/";
		var trackExists = (trackId != -1);
		$.ajax
		({
			url: tracksUrl,
			type: trackExists ? "PUT" : "POST",
			data:
			{
				itemId: itemId,
				artist: trackExists ? [artist, artistChanged] : artist,
				title: trackExists ? [title, titleChanged] : title
			},
			success: function(response)
			{
				if(response.error) return;
				var trackId = response;
				var externalId = $(".item").filterByData("itemId", itemId).data("externalId");
				var $items = $(".item").filterByData("externalId", externalId)
				artist = artist.replace(/&\+/g, "<span>&</span>");
				title = title.replace(/\((.+)\)/g, "<span>$1</span>");
				$(":nth-child(1)", $items).html(artist);
				$(":nth-child(2)", $items).html(title);
				if($items.is(".active"))
				{
					$("#meta-artist").html(artist);
					$("#meta-title").html(title);
				}
				$items.data("trackId", trackId);
				$("#overlay").click();
			}
		});
	}


	// Tabs
	function setActiveTab(aliasOrReference, byReference)
	{
		var $tab = byReference ? aliasOrReference : $("#menu-" + aliasOrReference);
		if($tab.is(".active")) return;
		$("#tabs-menu div").removeClass("active");
		$("#tabs .tab-contents").removeClass("active");
		$tab.addClass("active");
		$("#tabs .tab-contents").eq($tab.index()).addClass("active");
	}
	$("#tabs-menu div").click(function() { setActiveTab($(this), true); });


	// Content Tab
	function setContentSwitchEnabled(enabled)
	{
		var $buttons = $("#content-previous, #content-next");
		enabled ? $buttons.removeClass("inactive") : $buttons.addClass("inactive");
	}

	function switchActiveContent(forward)
	{
		var $item = $(".item.active");
		if(!$item.length) return setContentSwitchEnabled(false);
		var content = $("#tab-content").data("content");
		if(!content || !content.length)
		{
			return requestContent($item.data("trackId"), false, forward);
		}
		if(content.length < 2) return setContentSwitchEnabled(false);
		setContentSwitchEnabled(true);
		var newContent;
		for(var index = 0; index < content.length; index++)
		{
			if($item.data("sourceId") == content[index][0] && $item.data("externalId") == content[index][1])
			{
				newContent = forward ? content[++index] : content[--index];
				break;
			}
		}
		if(!newContent)
		{
			newContent = forward ? content[0] : content[content.length - 1];
		}
		$item.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: true
		})
		.removeClass("active");
		$(":first-child", $item).click();
	}
	$("#content-previous").click(function() { switchActiveContent(false); });
	$("#content-next").click(function() { switchActiveContent(true); });


	// Controls
	$("#play").click(function()
	{
		if(!soundcloudPlayer && (!youtubeReady || youtubePlayer.getPlayerState() == 5) &&
			$(".item.active").length < 1)
		{
			$(".item:first .artist").click();
			return;
		}
		if(soundcloudPlayer)
		{
			soundcloudPlayer.play();
		}
		else
		{
			if(!youtubeReady) return;
			youtubePlayer.playVideo();
		}
		$("#play").hide();
		$("#pause").show();
	});

	$("#pause").click(function()
	{
		if(soundcloudPlayer)
		{
			soundcloudPlayer.pause();
		}
		else
		{
			if(!youtubeReady) return;
			youtubePlayer.pauseVideo();
		}
		$("#pause").hide();
		$("#play").show();
		$("#seekbar-fill").finish();
	});

	$("#previous").click(function() { switchActiveItem(false, true); });
	$("#next").click(function() { switchActiveItem(true, true); });

	var volumeStates = {silent: "off", quiet: "down", loud: "up"};
	function updateVolumeDisplay()
	{
		$("#volume-fill").width(volume + "%");
		var state = "loud";
		if(volume == 0) state = "silent";
		else if(volume < 30) state = "quiet";
		$("#speaker").attr("class", "icon " + state + " fa fa-volume-" + volumeStates[state]);
		if(muted) return $("#muted").show();
		$("#muted").hide();
	}
	updateVolumeDisplay();

	$("#seekbar").mousedown(function(e)
	{
		if(!soundcloudPlayer && (!youtubeReady || youtubePlayer.getPlayerState() == 5)) return;
		if(seeking) return;
		if(e.which != 1) return;
		updateSeekbar();
		dragInterval = setInterval(updateSeekbar, 10);
		seeking = true;
		freeze = true;
	});

	$("#speaker").click(function()
	{
		if(muted && volume < 1)
		{
			volume = lastVolume;
			$("#volume-fill").width(volume / 100 * $("#volume").width());
			muted = false;
		}
		else
		{
			lastVolume = volume;
			volume = 0;
			$("#volume-fill").width(0);
			muted = true;
		}
		updateVolume(true);
	});

	$("#volume").mousedown(function(e)
	{
		if(e.which != 1) return;
		updateVolume();
		dragInterval = setInterval(updateVolume, 10);
		changingVolume = true;
		muted = false;
	});

	function updateSeekbar()
	{
		var seek = Math.max(Math.min((mouseX - $("#seekbar").offset().left) / $("#seekbar").width(), 1), 0);
		var date = new Date(null);
		if(soundcloudPlayer)
		{
			var milliseconds = seek * soundcloudPlayer.options.duration;
			if(!soundcloudPlayer.isPlaying()) soundcloudPlayer.play();
			soundcloudPlayer.seek(milliseconds, false);
			$("#seekbar-fill").stop(true, true).width((seek * 100) + "%");
			date.setMilliseconds(milliseconds);
			$("#current-time").text(date.toISOString().substr(14, 5));
			return;
		}
		if(!youtubeReady) return;
		var seconds = seek * youtubePlayer.getDuration();
		youtubePlayer.seekTo(seconds, false);
		$("#seekbar-fill").stop(true, true).width((seek * 100) + "%");
		date.setSeconds(seconds);
		$("#current-time").text(date.toISOString().substr(14, 5));
	}

	function updateVolume(skipVar)
	{
		if(!skipVar) volume = Math.max(Math.min((mouseX - $("#volume").offset().left) /
			$("#volume").width(), 1), 0) * 100;
		updateVolumeDisplay();
		if(soundcloudPlayer) soundcloudPlayer.setVolume(volume / 100);
		if(!youtubeReady) return;
		youtubePlayer.setVolume(volume);
	}

	// Playback
	setInterval(function()
	{
		if(freeze) return;
		var date = new Date(null);
		if(soundcloudPlayer)
		{
			date.setMilliseconds(soundcloudPlayer.options.duration);
			$("#total-time").text(date.toISOString().substr(14, 5));
			if(!soundcloudPlayer.isPlaying()) return;
			$("#seekbar-fill").stop(true, true).animate(
				{"width": (soundcloudPlayer.currentTime() / soundcloudPlayer.options.duration * 100) + "%"},
				500, "linear"
			);
			date = new Date(null);
			date.setMilliseconds(soundcloudPlayer.currentTime());
			$("#current-time").text(date.toISOString().substr(14, 5));
			soundcloudPlayer.setVolume(volume / 100);
			return;
		}
		if(!youtubeReady) return;
		if(youtubePlayer.getPlayerState() == -1) return;
		var duration = youtubePlayer.getDuration() || 60;
		date.setSeconds(duration);
		$("#total-time").text(date.toISOString().substr(14, 5));
		if(youtubePlayer.getPlayerState() != YT.PlayerState.PLAYING) return;
		$("#seekbar-fill").stop(true, true).animate(
			{"width": (youtubePlayer.getCurrentTime() / duration * 100) + "%"},
			500, "linear"
		);
		date = new Date(null);
		date.setSeconds(youtubePlayer.getCurrentTime());
		$("#current-time").text(date.toISOString().substr(14, 5));
		youtubePlayer.setVolume(volume);
	}, 500);

	loaded();
});

function loaded()
{
	scriptsLoaded++;
	if(scriptsLoaded < 2) return;
	// Loading Complete
	$("#loading").fadeOut(500);
	$("#spinner").animate( {"width": "20px", "height": "20px" }, 1000);
	$("#header .button").fadeIn(500).css("display", "inline-block");
}

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function() { return $(this).data(key) && $(this).data(key) == value; });
};
