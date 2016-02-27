$.getScript("https://www.youtube.com/iframe_api");

$(document).ready(function()
{
	// Cookies
	var Cookies = {}
	Cookies.get = function(name, defaultValue)
	{
		var value = $.cookie(name);
		if(typeof value == "undefined") return defaultValue;
		return JSON.parse(value);
	}
	Cookies.set = function(name, value)
	{
		$.cookie(name, value);
	}
	$.cookie.defaults.path = "/";

	// Player
	var Player =
	{
		playing: false, // Player state is set to playing
		volume: Cookies.get("volume", 80), // Playback volume
		lastVolume: 0, // Playback volume before muting
		muted: false, // Sound is muted by the user
		draggingSeekbar: false, // Seekbar is being dragged
		freezeSeekbar: false, // Disable seekbar animation
		draggingVolume: false, // Volume bar is being dragged
		mouseX: 0 // Horizontal position of the mouse cursor
	}
	Player.play = function()
	{
		if(!SoundCloud.player && (!YouTube.loaded || YouTube.player.getPlayerState() == 5) &&
			$(".item.active").length < 1)
		{
			$(".item:first .artist").click();
			return;
		}
		if(SoundCloud.player)
		{
			SoundCloud.player.play();
		}
		else
		{
			if(!YouTube.loaded) return;
			YouTube.player.playVideo();
		}
		$("#play").hide();
		$("#pause").show();
		Player.playing = true;
	}
	Player.pause = function()
	{
		if(SoundCloud.player)
		{
			SoundCloud.player.pause();
		}
		else
		{
			if(!YouTube.loaded) return;
			YouTube.player.pauseVideo();
		}
		$("#pause").hide();
		$("#play").show();
		$("#seekbar-fill").finish();
		Player.playing = false;
	}
	Player.toggle = function()
	{
		Player.playing ? Player.pause() : Player.play();
	}
	Player.setItem = function()
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
		if(SoundCloud.player)
		{
			SoundCloud.player.pause();
			SoundCloud.player.dispose();
			SoundCloud.player = null;
		}
		$("#seekbar-fill").stop(true, true).width(0);
		$("#current-time").text("00:00");
		$("#total-time").text("00:00");
		$("#tab-content").data("content", []);
		ContentTab.setSwitchEnabled(true);
		if(!$item.data("sourceId"))
		{
			$item.addClass("active");
			return Content.request($item.data("trackId"), true);
		}
		if($item.data("sourceId") == Source.YouTube)
		{
			if(!YouTube.loaded) return;
			$item.addClass("active");
			$("#cover").empty().hide();
			$("#video").show();
			var externalId = $item.data("externalId");
			YouTube.player.loadVideoById(externalId);
			$("#content-image").attr("src", "http://img.youtube.com/vi/" + externalId + "/0.jpg");
			return;
		}
		if($item.data("sourceId") == Source.SoundCloud)
		{
			$item.addClass("active");
			if(YouTube.loaded)
			{
				YouTube.player.stopVideo();
				YouTube.player.clearVideo();
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
						.addClass("back").click(Player.toggle)
					);
					$("#cover")
						.append($("<img>").attr("src", imageUrl.replace("large", "t300x300"))
						.addClass("front").click(Player.toggle)
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
				SoundCloud.player = trackPlayer;
				SoundCloud.player.play();
				SoundCloud.player.setVolume(Player.volume / 100);
				SoundCloud.player.on("state-change", function(state)
				{
					var playing = (state == "playing" || state == "loading" || state == "seeking");
					Player.playing = playing;
					$("#pause").toggle(playing);
					$("#play").toggle(!playing);
					if(playing) return;
					$("#seekbar-fill").finish();
					if(state != "ended") return;
					Player.switchItem(Direction.Next);
				});
			});
			return;
		}
	}
	Player.switchItem = function(forward, manual)
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
	Player.updateSeekbar = function()
	{
		var seek = Math.max(Math.min((Player.mouseX - $("#seekbar").offset().left) / $("#seekbar").width(), 1), 0);
		var date = new Date(null);
		if(SoundCloud.player)
		{
			var milliseconds = seek * SoundCloud.player.options.duration;
			if(!SoundCloud.player.isPlaying()) SoundCloud.player.play();
			SoundCloud.player.seek(milliseconds, false);
			$("#seekbar-fill").stop(true, true).width((seek * 100) + "%");
			date.setMilliseconds(milliseconds);
			$("#current-time").text(date.toISOString().substr(14, 5));
			return;
		}
		if(!YouTube.loaded) return;
		var seconds = seek * YouTube.player.getDuration();
		YouTube.player.seekTo(seconds, false);
		$("#seekbar-fill").stop(true, true).width((seek * 100) + "%");
		date.setSeconds(seconds);
		$("#current-time").text(date.toISOString().substr(14, 5));
	}
	Player.onVolumeBarDrag = function()
	{
		Player.volume = Math.max(Math.min((Player.mouseX - $("#volume").offset().left) / $("#volume").width(), 1), 0) * 100;
		Player.updateVolume();
	}
	Player.updateVolume = function()
	{
		if(SoundCloud.player)
		{
			SoundCloud.player.setVolume(Player.volume / 100);
		}
		else if(YouTube.loaded)
		{
			YouTube.player.setVolume(Player.volume);
		}
		$("#volume-fill").width(Player.volume + "%");
		var state = "up";
		if(Player.volume == 0) state = "off";
		else if(Player.volume < 30) state = "down";
		$("#speaker").attr("class", "icon " + state + " fa fa-volume-" + state);
		if(Player.muted) return $("#muted").show();
		$("#muted").hide();
	}
	Player.onTick = function()
	{
		if(Player.freezeSeekbar) return;
		var date = new Date(null);
		if(SoundCloud.player)
		{
			date.setMilliseconds(SoundCloud.player.options.duration);
			$("#total-time").text(date.toISOString().substr(14, 5));
			if(!SoundCloud.player.isPlaying()) return;
			$("#seekbar-fill").stop(true, true).animate(
				{"width": (SoundCloud.player.currentTime() / SoundCloud.player.options.duration * 100) + "%"},
				500, "linear"
			);
			date = new Date(null);
			date.setMilliseconds(SoundCloud.player.currentTime());
			$("#current-time").text(date.toISOString().substr(14, 5));
			SoundCloud.player.setVolume(Player.volume / 100);
			return;
		}
		if(!YouTube.loaded) return;
		if(YouTube.player.getPlayerState() == -1) return;
		var duration = YouTube.player.getDuration() || 60;
		date.setSeconds(duration);
		$("#total-time").text(date.toISOString().substr(14, 5));
		if(YouTube.player.getPlayerState() != YT.PlayerState.PLAYING) return;
		$("#seekbar-fill").stop(true, true).animate(
			{"width": (YouTube.player.getCurrentTime() / duration * 100) + "%"},
			500, "linear"
		);
		date = new Date(null);
		date.setSeconds(YouTube.player.getCurrentTime());
		$("#current-time").text(date.toISOString().substr(14, 5));
		YouTube.player.setVolume(Player.volume);
	}
	Player.onPreviousClick = function()
	{
		Player.switchItem(Direction.Previous, Switch.Manual);
	}
	Player.onNextClick = function()
	{
		Player.switchItem(Direction.Next, Switch.Manual);
	}
	Player.onSeekbarMouseDown = function(event)
	{
		if(!SoundCloud.player && (!YouTube.loaded || YouTube.player.getPlayerState() == 5)) return;
		if(Player.draggingSeekbar) return;
		if(event.which != 1) return;
		Player.updateSeekbar();
		Player.dragInterval = setInterval(Player.updateSeekbar, 10);
		Player.draggingSeekbar = true;
		Player.freezeSeekbar = true;
	}
	Player.onSpeakerClick = function()
	{
		if(Player.muted && Player.volume < 1)
		{
			Player.volume = Player.lastVolume;
			$("#volume-fill").width(Player.volume / 100 * $("#volume").width());
			Player.muted = false;
		}
		else
		{
			Player.lastVolume = Player.volume;
			Player.volume = 0;
			$("#volume-fill").width(0);
			Player.muted = true;
		}
		Player.updateVolume();
	}
	Player.onVolumeBarMouseDown = function(event)
	{
		if(event.which != 1) return;
		Player.onVolumeBarDrag();
		Player.dragInterval = setInterval(Player.onVolumeBarDrag, 10);
		Player.draggingVolume = true;
		Player.muted = false;
	}
	Player.init = function()
	{
		$("#play").click(Player.play);
		$("#pause").click(Player.pause);
		$("#previous").click(Player.onPreviousClick);
		$("#next").click(Player.onNextClick);
		$("#seekbar").mousedown(Player.onSeekbarMouseDown);
		$("#speaker").click(Player.onSpeakerClick);
		$("#volume").mousedown(Player.onVolumeBarMouseDown);
		setInterval(Player.onTick, 500);
	}

	// Enums
	var Source = { YouTube: 1, SoundCloud: 2 };
	var Direction = { Previous: false, Next: true };
	var Switch = { Automatic: false, Manual: true };

	// YouTube
	var YouTube =
	{
		loaded: false,
		hd: Cookies.get("hd", true)
	}
	YouTube.updatePlaybackQuality = function()
	{
		YouTube.player.setPlaybackQuality(hd ? "hd720" : "large");
		$("#hd").toggleClass("disabled", !YouTube.hd);
	}
	YouTube.onPlayerReady = function()
	{
		YouTube.loaded = true;
		Player.updateVolume();
		YouTube.updatePlaybackQuality();
	}
	YouTube.onPlayerStateChange = function(event)
	{
		var state = event.data
		var playing = (state == YT.PlayerState.PLAYING || state == YT.PlayerState.BUFFERING);
		Player.playing = playing;
		$("#pause").toggle(playing);
		$("#play").toggle(!playing);
		if(playing) return;
		$("#seekbar-fill").finish();
		if(state != YT.PlayerState.ENDED) return;
		Player.switchItem(Direction.Next);
	}
	YouTube.onPlayerError = function()
	{
		ContentTab.switchContent(Direction.Next, true);
	}
	window.onYouTubeIframeAPIReady = function()
	{
		YouTube.player = new YT.Player("video-iframe",
		{
			width: "480",
			height: "270",
			playerVars:
			{
				"controls": 0, // Player controls do not display in the player
				"iv_load_policy": 3, // Annotations not shown by default
				"rel": 0, // Do not show related videos at the end of playback
				"showinfo": 0 // Hide information about title and uploader
			},
			events:
			{
				"onReady": YouTube.onPlayerReady,
				"onStateChange": YouTube.onPlayerStateChange,
				"onError": YouTube.onPlayerError
			}
		});
	}

	// SoundCloud
	var SoundCloud = {};
	SC.initialize
	({
		client_id: "2f8f0d3feaba4ed1c596902b225aad55"
	});

	// Document
	$(document).mousemove(function(event)
	{
		Player.mouseX = event.pageX;
	});
	$(document).mouseup(function()
	{
		if(typeof Player.dragInterval == "undefined") return;
		clearInterval(Player.dragInterval);
		if(Player.draggingVolume)
		{
			Cookies.set("volume", Math.round(Player.volume).toString());
			Player.draggingVolume = false;
			return;
		}
		if(!Player.draggingSeekbar) return;
		Player.draggingSeekbar = false;
		setTimeout(function() { Player.freezeSeekbar = false; }, 500);
		var seek = Math.min((Player.mouseX - $("#seekbar").offset().left) / $("#seekbar").width(), 1);
		if(SoundCloud.player)
		{
			if(!SoundCloud.player.isPlaying()) SoundCloud.player.play();
			SoundCloud.player.seek(seek * SoundCloud.player.options.duration, false);
			return;
		}
		YouTube.player.seekTo(seek * YouTube.player.getDuration(), true);
	});

	// YouTube
	YouTube.togglePlaybackQuality = function()
	{
		YouTube.hd = !YouTube.hd;
		Cookies.set("hd", YouTube.hd.toString());
		YouTube.updatePlaybackQuality();
	}
	YouTube.init = function()
	{
		$("#video").hover(function()
		{
			$("#hd").stop(true).fadeIn(200);
		},
		function()
		{
			$("#hd").stop(true).delay(5000).fadeOut(2000);
		});
		$("#hd").click(YouTube.togglePlaybackQuality);
	}

	// Item
	var Item = {};
	Item.edit = function()
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
					Item.rename(itemId, trackId, $("#edit-artist").val(), $("#edit-title").val(), artistChanged, titleChanged);
				});
				return;
			}
			if(!itemId) return $("#window-button").text("");
			$("#window-button").text("REMOVE").unbind().click(function()
			{
				Item.remove(itemId);
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
	Item.remove = function(itemId)
	{
		$.ajax
		({
			url: "/items/" + itemId + "/",
			type: "DELETE",
			success: function(response)
			{
				if(response.error) return;
				var $item = $(".item").filterByData("itemId", itemId);
				if($item.is(".active")) Player.switchItem(Direction.Next);
				$item.remove();
				Playlists.setTrackCounter($(".item").length);
				$("#overlay").click();
			}
		});
	}
	Item.rename = function(itemId, trackId, artist, title, artistChanged, titleChanged)
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

	// Item List
	var ItemList = {};
	ItemList.setItems = function(items, store)
	{
		var storage = $("#items").data("storage") || [];
		if(store && !storage.length)
		{
			$(".item").each(function()
			{
				storage.push($(this).detach());
			});
			$("#items").data("storage", storage);
		}
		$("#items").empty();
		$.each(items, ItemList.addItem);
		$("#items").scrollTop(0);
	}
	ItemList.addItem = function(itemId, item, prepend)
	{
		var $item = $("<div>").addClass("item");
		$item.append($("<div>").addClass("artist").html(item[1].replace(/&\+/g, "<span>&</span>")));
		$item.append($("<div>").addClass("title").html(item[2].replace(/\((.+)\)/g, "<span>$1</span>")));
		$item.append($("<div>").addClass("icon add fa fa-plus"));
		$item.data("trackId", item[0]);
		if(item[3])
		{
			$item.data
			({
				"itemId": item[3],
				"sourceId": item[4],
				"externalId": item[5]
			})
			.append($("<div>").addClass("icon edit fa fa-pencil").click(Item.edit));
		}
		$item.children().slice(0, 2).click(Player.setItem);
		if(prepend)
		{
			$("#items").prepend($item);
			return;
		}
		$("#items").append($item);
	}
	ItemList.setFilter = function(query)
	{
		var count = 0;
		$(".item").each(function()
		{
			if(!length) return $(this).removeClass("hidden odd even");
			var hidden = true;
			$(this).children().slice(0, 2).each(function()
			{
				if($(this).text().toLowerCase().indexOf(query) != -1) hidden = false;
			});
			$(this).toggleClass("hidden", hidden).removeClass("odd even");
			if(hidden) return;
			(count % 2) ? $(this).addClass("even") : $(this).addClass("odd");
			count++;
		});
		$("#items").scrollTop(0);
	}
	ItemList.clearFilter = function()
	{
		$(".item").removeClass("hidden odd even");
		var storage = $("#items").data("storage");
		if(!storage || !storage.length) return;
		$("#items").empty();
		storage.forEach(function($item)
		{
			$("#items").append($item.removeClass("hidden odd even active"));
		});
		$("#items").data("storage", []);
	}

	// Playlists
	Playlists =
	{
		activeId: 1 // todo: use playlistId from current URL or user playlists
	}
	Playlists.setTrackCounter = function(count)
	{
		$("#playlist-details").text(count + " tracks");
	}
	Playlists.load = function(playlistId)
	{
		$.ajax
		({
			url: "/playlists/" + playlistId + "/",
			type: "GET",
			success: function(response)
			{
				if(response.error) return;
				var playlist = response[0];
				var items = response[1];
				$("#playlist-name").text(playlist[0]);
				ItemList.setItems(items);
				Playlists.setTrackCounter(items.length);
			}
		});
	}

	// Content
	var Content = {};
	Content.create = function(sourceId, externalId)
	{
		$.ajax
		({
			url: "/playlists/" + Playlists.activeId + "/",
			type: "POST",
			data: { sourceId: sourceId, externalId: externalId },
			success: function(response)
			{
				if(response.error) return;
				var trackId = response[0];
				var artist = response[1];
				var title = response[2];
				var itemId = response[3];
				ItemList.clearFilter();
				ItemList.addItem(0, [trackId, artist, title, itemId, sourceId, externalId], true);
				$("#items").scrollTop(0);
				Playlists.setTrackCounter($(".item").length);
			}
		});
	}
	Content.request = function(trackId, assignToItem, switchDirection, skipTrack)
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
				Tabs.setActive("content");
				if(!assignToItem) return ContentTab.switchContent(switchDirection, skipTrack);
				var nearest = response[0];
				if(!nearest) return;
				$item.data
				({
					"sourceId": nearest[0],
					"externalId": nearest[1]
				})
				.removeClass("active");
				$(":first-child", $item).click();
			}
		});
	}

	// Search
	var Search = {};
	Search.getItems = function(query)
	{
		$.ajax
		({
			url: "/search/" + query + "/",
			type: "GET",
			success: function(response)
			{
				if(response.error) return;
				var items = response;
				ItemList.setItems(items, true);
			}
		});
	}
	Search.clear = function()
	{
		$("#search").val("");
		$("#search-clear").hide();
	}
	Search.onKeyUp = function(event)
	{
		var query = $(this).val();
		var length = query.length;
		if(event.keyCode != 13 || length < 3)
		{
			if(query.indexOf("http") == 0)
			{
				$("#search-clear").is(":visible") ? ItemList.clearFilter() : $("#search-clear").fadeIn(200);
				return;
			}
			if(!length)
			{
				Search.clear();
				ItemList.clearFilter();
				return;
			}
			$("#search-clear").fadeIn(200);
			var storage = $("#items").data("storage");
			if(storage && storage.length) return;
			ItemList.setFilter(query);
			return;
		}
		var match = /(youtu.be\/|youtube.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&\"\'>]+)/.exec(query);
		if(match && match[5])
		{
			Content.create(Source.YouTube, match[5]);
			return;
		}
		match = /^https?:\/\/(soundcloud.com|snd.sc)\/(.*)$/.exec(query);
		if(match && match[2])
		{
			SC.resolve(query).then(function(response)
			{
				Content.create(Source.SoundCloud, response.id);
			});
			return;
		}
		query = encodeURIComponent(query).replace(/%20/g, "+");
		Search.getItems(query);
	}
	Search.onClearClick = function()
	{
		Search.clear();
		ItemList.clearFilter();
	}
	Search.init = function()
	{
		$("#search").keyup(Search.onKeyUp);
		$("#search-clear").click(Search.onClearClick);
	}

	// Tabs
	var Tabs = {};
	Tabs.setActive = function(alias)
	{
		var $tab = $("#menu-" + alias);
		if($tab.is(".active")) return;
		$("#tabs-menu div").removeClass("active");
		$("#tabs .tab-contents").removeClass("active");
		$tab.addClass("active");
		$("#tabs .tab-contents").eq($tab.index()).addClass("active");
	}
	Tabs.onClick = function()
	{
		Tabs.setActive($(this).attr("id").substring(5));
	}
	Tabs.init = function()
	{
		$("#tabs-menu div").click(Tabs.onClick);
		ContentTab.init();
	}

	// Content Tab
	var ContentTab = {};
	ContentTab.setSwitchEnabled = function(enabled)
	{
		var $buttons = $("#content-previous, #content-next");
		enabled ? $buttons.removeClass("inactive") : $buttons.addClass("inactive");
	}
	ContentTab.switchContent = function(forward, skipTrack)
	{
		var $item = $(".item.active");
		if(!$item.length) return ContentTab.setSwitchEnabled(false);
		var content = $("#tab-content").data("content");
		if(!content || !content.length)
		{
			return Content.request($item.data("trackId"), false, forward, skipTrack);
		}
		if(content.length < 2)
		{
			if(skipTrack) Player.switchItem(Direction.Next);
			return ContentTab.setSwitchEnabled(false);
		}
		ContentTab.setSwitchEnabled(true);
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
	ContentTab.onPreviousClick = function()
	{
		ContentTab.switchContent(Direction.Previous);
	}
	ContentTab.onNextClick = function()
	{
		ContentTab.switchContent(Direction.Next);
	}
	ContentTab.init = function()
	{
		$("#content-previous").click(ContentTab.onPreviousClick);
		$("#content-next").click(ContentTab.onNextClick);
	}

	// Loading
	var Loading = {};
	Loading.complete = function()
	{
		$("#loading").fadeOut(500);
		$("#spinner").animate({ "width": "20px", "height": "20px" }, 1000);
		$("#header .button").fadeIn(500).css("display", "inline-block");
	}

	// Init
	Player.init();
	YouTube.init();
	Search.init();
	Tabs.init();

	Playlists.load(Playlists.activeId);
	Player.updateVolume();

	setTimeout(Loading.complete, 2000);
});

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function() { return $(this).data(key) && $(this).data(key) == value; });
};
