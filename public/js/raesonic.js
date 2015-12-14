scriptsLoaded = 0;

// Cookies
var volume = 80;

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
	youtubePlayer = new YT.Player("video",
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
function onPlayerReady(event)
{
	youtubeReady = true;
	loaded();
}
function onPlayerStateChange(event)
{
	if(event.data != YT.PlayerState.PLAYING && event.data != YT.PlayerState.BUFFERING)
	{
		$("#pause").hide();
		$("#play").show();
		$("#seekbar-fill").finish();
		if(event.data == YT.PlayerState.ENDED) $("#next").click();
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
			$("#playlist-details").text(items.length + " tracks");
			setItems(items);
		}
	});

	// Search
	$("#search").keyup(function(e)
	{
		// todo: hide tracks not matching query
		if(e.keyCode != 13) return;
		var query = $(this).val();
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
				setItems(items);
				// todo: clicking x or clearing input should show previous items, without requerying server
			}
		});
	});

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
				addItem(0, [trackId, artist, title, itemId, sourceId, externalId], true);
				$("#search").val("");
			}
		});
	}

	function setItems(items)
	{
		$("#items").empty();
		$.each(items, addItem);
	}

	function addItem(itemId, item, prepend)
	{
		var $item = $("<div>").addClass("item");
		$item.append($("<div>").addClass("artist").html(item[1].replace(/&\+/g, "<span>&</span>")));
		$item.append($("<div>").addClass("title").html(item[2].replace(/\((.+)\)/g, "<span>$1</span>")));
		$item.append($("<div>").addClass("icon edit fa fa-pencil").click(editItem));
		$item.append($("<div>").addClass("icon add fa fa-plus"));
		$item.attr("data-trackId", item[0]);
		if(item[3])
		{
			$item.attr
			({
				"data-itemId": item[3],
				"data-sourceId": item[4],
				"data-externalId": item[5]
			});
		}
		$item.children().slice(0, 2).click(playItem);
		if(prepend)
		{
			$("#items").prepend($item);
			return;
		}
		$("#items").append($item);
		// todo: scroll to top
	}

	// Handlers
	function playItem()
	{
		$item = $(this).parent();
		if($item.is(".active")) return;
		$("#meta-artist").html($item.find(".artist").html());
		$("#meta-title").html($item.find(".title").html());
		$("#items .item").removeClass("active");
		$item.addClass("active");
		// todo: scroll to track if in playlist view
		if(soundcloudPlayer)
		{
			soundcloudPlayer.pause();
			soundcloudPlayer.dispose();
			soundcloudPlayer = null;
		}
		$("#seekbar-fill").stop(true, true).width(0);
		$("#current-time").text("00:00");
		$("#total-time").text("00:00");
		if($item.attr("data-sourceId") == "1")
		{
			$("#cover").empty().hide();
			$("#video").show();
			youtubePlayer.loadVideoById($item.attr("data-externalId"));
			return;
		}
		if($item.attr("data-sourceId") == "2")
		{
			if(youtubeReady)
			{
				youtubePlayer.stopVideo();
				youtubePlayer.clearVideo();
			}
			$("#video").hide();
			$("#cover").empty();
			var trackString = "/tracks/" + $item.attr("data-externalId");
			SC.get(trackString).then(function(response)
			{
				var imageUrl = response.artwork_url || response.user.avatar_url;
				if(imageUrl)
				{
					$("#cover")
						.append($("<img>").attr("src", imageUrl.replace("large", "t500x500"))
						.addClass("back")
					);
					$("#cover")
						.append($("<img>").attr("src", imageUrl.replace("large", "t300x300"))
						.addClass("front")
					);
				}
				$("#cover")
					.append($("<a>").attr("href", response.permalink_url).attr("target", "_blank")
						.click(function()
						{
							$("#pause").click();
						})
					.append($("<img>").attr("src", "/img/soundcloud.png").attr("id", "soundcloud"))
				);
				$("#cover")
					.append($("<a>").attr("href", response.user.permalink_url).attr("target", "_blank")
					.attr("id", "creator").text(response.user.username).delay(5000).fadeOut(2000))
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
						if(state == "ended") $("#next").click();
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
		var trackId = $item.attr("data-trackId");
		var itemId = $item.attr("data-itemId");
		var artist = "";
		var title = "";
		function updateWindowButton()
		{
			if($("#edit-artist").val() != artist || $("#edit-title").val() != title)
			{
				$("#window-button").text("SAVE").unbind().click(function()
				{
					renameItem(itemId, trackId, $("#edit-artist").val(), $("#edit-title").val());
				});
				return;
			}
			if(!itemId) return $("#window-button").text("");
			$("#window-button").text("REMOVE").unbind().click(function()
			{
				removeItem(itemId)
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
			.append($("<input>").attr("id", "edit-artist").attr("type", "text").attr("placeholder", "Artist")
				.val(artist).keyup(updateWindowButton))
			.append($("<input>").attr("id", "edit-title").attr("type", "text").attr("placeholder", "Title")
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
				var $item = $(".item[data-itemId=\"" + itemId.toString() + "\"]");
				if($item.is(".active")) $("#next").click();
				$item.remove();
				$("#overlay").click();
			}
		});
	}

	function renameItem(itemId, trackId, artist, title)
	{
		var tracksUrl = "/tracks/";
		if(trackId != -1) tracksUrl = tracksUrl + trackId.toString() + "/";
		$.ajax
		({
			url: tracksUrl,
			type: (trackId != -1) ? "PUT" : "POST",
			data: { itemId: itemId, artist: artist, title: title },
			success: function(response)
			{
				if(response.error) return;
				var trackId = response;
				var externalId = $(".item[data-itemId=\"" + itemId.toString() + "\"]").attr("data-externalId");
				var $item = $(".item[data-externalId=\"" + externalId + "\"]");
				artist = artist.replace(/&\+/g, "<span>&</span>");
				title = title.replace(/\((.+)\)/g, "<span>$1</span>");
				$(":nth-child(1)", $item).html(artist);
				$(":nth-child(2)", $item).html(title);
				if($item.is(".active"))
				{
					$("#meta-artist").html(artist);
					$("#meta-title").html(title);
				}
				$item.attr("data-trackId", trackId);
				$("#overlay").click();
			}
		});
	}

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

	$("#previous").click(function()
	{
		var $prev = $(".item.active").closest(".item").prev();
		if($prev.length < 1) $prev = $(".item:last");
		$(":first-child", $prev).click();
	});

	$("#next").click(function()
	{
		var $next = $(".item.active").closest(".item").next();
		if($next.length < 1) $next = $(".item:first");
		$(":first-child", $next).click();
	});

	var volumeStates = {silent: "off", quiet: "down", loud: "up"};
	function updateVolumeDisplay()
	{
		$("#volume-fill").width(volume.toString() + "%");
		var state = "loud";
		if(volume == 0) state = "silent";
		else if(volume < 30) state = "quiet";
		$("#speaker").attr("class", "icon " + state + " fa fa-volume-" + volumeStates[state]);
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

	$("#volume").mousedown(function(e)
	{
		if(e.which != 1) return;
		updateVolume();
		dragInterval = setInterval(updateVolume, 10);
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
			$("#seekbar-fill").stop(true, true).width((seek * 100).toString() + "%");
			date.setMilliseconds(milliseconds);
			$("#current-time").text(date.toISOString().substr(14, 5));
			return;
		}
		if(!youtubeReady) return;
		var seconds = seek * youtubePlayer.getDuration();
		youtubePlayer.seekTo(seconds, false);
		$("#seekbar-fill").stop(true, true).width((seek * 100).toString() + "%");
		date.setSeconds(seconds);
		$("#current-time").text(date.toISOString().substr(14, 5));
	}

	function updateVolume()
	{
		volume = Math.max(Math.min((mouseX - $("#volume").offset().left) / $("#volume").width(), 1), 0) * 100;
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
				{"width": (soundcloudPlayer.currentTime() / soundcloudPlayer.options.duration * 100).toString() + "%"},
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
		date.setSeconds(youtubePlayer.getDuration());
		$("#total-time").text(date.toISOString().substr(14, 5));
		if(youtubePlayer.getPlayerState() != YT.PlayerState.PLAYING) return;
		$("#seekbar-fill").stop(true, true).animate(
			{"width": (youtubePlayer.getCurrentTime() / youtubePlayer.getDuration() * 100).toString() + "%"},
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
