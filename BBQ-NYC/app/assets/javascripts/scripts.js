$(function() {

  console.log("scripts.js linked");

  // ------------------------- Models -------------------------
  var Location = Backbone.Model.extend({
    urlRoot: "/api/locations"
  });

  var Event = Backbone.Model.extend({
    urlRoot: 'api/events'
  });

  var Supply = Backbone.Model.extend({
    urlRoot: function() {
      return 'api/events/' + this.get('event_id') + '/supplies'
    }
  })

  var User = Backbone.Model.extend({
    initialize: function() {
      // an example of how you can make the model
      // log itself in after being created
      // this.on('sync', this.login, this);
    },
    urlRoot: '/api/users'
  });

  var Rsvp = Backbone.Model.extend({
    urlRoot: function() {
      // we want to think about this resource as returning RSVPs
      return 'api/events/' + this.get('event_id') + '/rsvps'
    }
  })

  // ------------------------- Collections -------------------------
  var LocationsCollection = Backbone.Collection.extend({
    model: Location,
    url: '/api/locations'
  });

  var EventCollection = Backbone.Collection.extend({
    url: 'api/events',
    model: Event
  });

  var RsvpCollection = Backbone.Collection.extend({
    model: Rsvp,
    initialize: function(opts) {
      this.event_id = opts.event_id;
    },
    url: function() {
      return 'api/events/' + this.event_id + '/rsvps';
    }
  });

  var SupplyCollection = Backbone.Collection.extend({
    model: Supply,
    initialize: function(opts) {
      this.event_id = opts.event_id;
    },
    url: function() {
      return 'api/events/' + this.event_id + '/supplies';
    }
  })

  // ------------------------- Views -------------------------

  var RsvpTableView = Backbone.View.extend({
    initialize: function(opts) {
      this.model = opts.model
      console.log(this.model)
    },
    tagName: 'tr',
    template: _.template($('script[data-id="guest-template"]').text()),
    render: function() {
      this.$el.html(this.template(this.model.attributes))
    }
  });

  // ------------------------- Collection Views -------------------------
  var LocationsCollectionView = Backbone.View.extend({

    initialize: function() {
      console.log("location collection view initialized");
      this.listenTo(this.collection, 'reset', this.render);
      this.collection.fetch({
        reset: true
      });
    },
    template: _.template($('script[data-id="map-view"]').html()),

    initializeMap: function() {

      this.map = new google.maps.Map(this.$el.find('#map-canvas')[0], {
        center: new google.maps.LatLng(40.740000, -73.940000),
        zoom: 11,
        // Snazzy Maps Style
        styles: [{
          "featureType": "landscape",
          "stylers": [{
            "hue": "#FFA800"
          }, {
            "saturation": 0
          }, {
            "lightness": 0
          }, {
            "gamma": 1
          }]
        }, {
          "featureType": "road.highway",
          "stylers": [{
            "hue": "#53FF00"
          }, {
            "saturation": -73
          }, {
            "lightness": 40
          }, {
            "gamma": 1
          }]
        }, {
          "featureType": "road.arterial",
          "stylers": [{
            "hue": "#FBFF00"
          }, {
            "saturation": 0
          }, {
            "lightness": 0
          }, {
            "gamma": 1
          }]
        }, {
          "featureType": "road.local",
          "stylers": [{
            "hue": "#00FFFD"
          }, {
            "saturation": 0
          }, {
            "lightness": 30
          }, {
            "gamma": 1
          }]
        }, {
          "featureType": "water",
          "stylers": [{
            "hue": "#00BFFF"
          }, {
            "saturation": 6
          }, {
            "lightness": 8
          }, {
            "gamma": 1
          }]
        }, {
          "featureType": "poi",
          "stylers": [{
            "hue": "#679714"
          }, {
            "saturation": 33.4
          }, {
            "lightness": -25.4
          }, {
            "gamma": 1
          }]
        }]
      });


      var image = {
        url: 'assets/sausage.png',
        // This marker is 30 pixels wide by 30 pixels tall.
        size: new google.maps.Size(30, 30),
        // The origin for this image is 0,0.
        origin: new google.maps.Point(0, 0),
        // The anchor for this image is the base of the fork at 15,30.
        anchor: new google.maps.Point(15, 30)
      };

      function infoWindow(marker, map, park) {

        google.maps.event.addListener(marker, 'click', function() {

          var html = "<div id=iw-content><img class='iw-image' src='" + park.photo_url + "' /><h3>" + park.name + "</h3><p class='iw-info'><b>Location:</b> " + park.location + "<br/><b>Address: </b><em>" + park.address + "</em><br/><b>Park Hours: </b>" + park.hours + "</p><span class='iw-ratings'>&hearts; " + park.rating + "</span><a class='iw-website' href='" + park.website + "' target='_blank'>Visit park website</a><p class='iw-description'>" + park.description + "</p><a class='button' href='/#create?location_id=" + park.id + "'>Grill Here</a></div>";

          iw = new google.maps.InfoWindow({
            content: html,
            maxWidth: 680
          });
          iw.open(map, marker);
        });

        google.maps.event.addListener(map, 'click', function() {
          iw.close();
        });
      }

      this.collection.each(function(park) {
        var parkLatLng = new google.maps.LatLng(park.get('latitude'), park.get('longitude'));

        var circle = new google.maps.Circle({
          center: parkLatLng,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
          map: this.map,
          radius: 250
        });

        var marker = new google.maps.Marker({
          position: parkLatLng,
          map: this.map,
          icon: image,
          animation: google.maps.Animation.DROP,
          title: park.get('name'),
          zIndex: 10
        });
        infoWindow(marker, this.map, park.toJSON());
      }.bind(this));
    },
    render: function() {
      this.$el.html(this.template());
      this.initializeMap();
      $(".steps li:nth-child(1)").addClass('done').removeClass('to-do');
    }
  }); // end locations collection view

  // ------------------------- Other Views -------------------------
  // Create Event Page View
  var EventFormView = Backbone.View.extend({
    initialize: function(opts) {
      this.listenTo(this.model, 'sync', this.addUserToEvent);
      this.rsvp = opts.rsvp;
      this.currentUser = opts.currentUser;
      this.location_id = opts.location_id;
    },
    el: $('#main'),
    template: $('script[data-id="create-event-view"]').text(),
    events: {
      'submit': 'createEvent'
    },
    render: function() {
      this.$el.html(_.template(this.template));
      $(".steps li:nth-child(1)").addClass('done').removeClass('to-do');
      $(".steps li:nth-child(2)").addClass('done').removeClass('to-do');
      $("#slider").slider({
        animate: "slow",
        min: 480,
        max: 1320,
        step: 15,
        value: 840,
        slide: function(e, ui) {
          var hours = Math.floor(ui.value / 60);
          var minutes = ui.value - (hours * 60);
          if (hours.length == 1) hours = '0' + hours;
          if (minutes.length == 1) minutes = '0' + minutes;
          if (minutes === 0) minutes = '00';
          if (hours >= 12) {
            if (hours == 12) {
              hours = hours;
              minutes = minutes + " PM";
            } else {
              hours = hours - 12;
              minutes = minutes + " PM";
            }
          } else {
            hours = hours;
            minutes = minutes + " AM";
          }
          if (hours === 0) {
            hours = 12;
            minutes = minutes;
          }
          $('.slider-time').html('Time: ' + hours + ':' + minutes);
        }
      });
      $("#datepicker").datepicker(
         {minDate: new Date(),
         dateFormat: "mm-dd-yy"}    
       );
    },
    createEvent: function(event) {
      event.preventDefault();
      var name = $('[name="event-name"]').val();
      var date = $('#datepicker').val();
      var description = $('[name="description"]').val();

      // Remove "Time: " label from time value
      var time = $('.slider-time').html();
      time = time.slice(6, time.length);

      // Hashtags stored without # characters
      var hashtag = $('[name="hashtag"]').val();
      if (hashtag.charAt(0) === "#") {
        hashtag = hashtag.slice(1, hashtag.length);
      }
      var newEvent = {
        name: name,
        hashtag: hashtag,
        date: date,
        description: description,
        time: time,
        location_id: this.location_id
      };
      this.model.save(newEvent);
    },

    addUserToEvent: function() {
      var actuallyAddTheUserToEvent = function() {
        var rsvpData = {
          user_id: this.currentUser.get('id'),
          event_id: this.model.get('id')
        };
        this.rsvp.save(rsvpData, {
          success: function(rsvp) {
            var user_id = rsvp.get('user_id')
            $.ajax({
              url: '/sessions',
              method: 'POST',
              data: {id: user_id}
            }).done(function() {
            })
          }
        });
      }

    if (this.currentUser.isNew()) {
      var userData = {
        name: $('[name="host-name"]').val(),
        email: $('[name="email"]').val()
      }

      this.currentUser.save(userData, {
        success: actuallyAddTheUserToEvent.bind(this)
      });

    } else {
      actuallyAddTheUserToEvent.apply(this);
    }

  }
  });

  // Event Details View
  var EventDetailsView = Backbone.View.extend({
    initialize: function(options) {
      console.log(this.model)
      this.model = options.model;
      this.user = options.user;
      this.rsvpCollection = options.rsvpCollection
      this.supplyCollection = options.supplyCollection
      this.rsvp = this.rsvpCollection.findWhere({
        event_id: this.model.get('id'),
        user_id: this.user.get('id')
      })
      this.render();
    },
    el: $('#main'),
    // 'precompile' templates...confusing underscore way of doing this
    template: _.template($('script[data-id="event-show-view"]').text()),
    render: function() {
      this.$el.html(this.template(this.model.attributes));
      var rsvpView = new RsvpView({
        model: this.rsvp,
        el: $('#rsvp-view')
      })
      var inviteView = new InviteView({
        model: this.model,
        collection: this.rsvpCollection,
        el: $('#invite-view')
      })

      $(".steps li:nth-child(1)").addClass('done').removeClass('to-do');
      $(".steps li:nth-child(2)").addClass('done').removeClass('to-do');
      $(".steps li:nth-child(3)").addClass('done').removeClass('to-do');
      // $("#radio").buttonset();
    },

  });

  var RsvpView = Backbone.View.extend({
    initialize: function() {
      this.render();
    },
    template: _.template($('script[data-id="rsvp-view-template"]').text()),
    saveRSVP: function(rsvp_value) {
      this.model.set("rsvp", rsvp_value);
      this.model.save();
    },
    events: {
      'click [data-action="going"]': function() {
        this.saveRSVP(true)
      },
      'click [data-action="not-going"]': function() {
        this.saveRSVP(false)
      },
      'click [data-action="maybe"]': function() {
        this.saveRSVP('')
      }
    },
    render: function() {
      this.$el.html(this.template);
    }
  });

  var InviteView = Backbone.View.extend({
    initialize: function(opts) {
      this.model = opts.model;
      this.collection = opts.collection;
      this.render();
    },
    template: _.template($('script[data-id="invite-view-template"]').text()),
    events: {
      'click [data-action="invite"]': 'inviteFriend',
    },
    inviteFriend: function(event) {
      event.preventDefault();
      var friendEmail = $('input[data-attr="friend-email"]').val();
      var friendName = null;
      var friend = new User({
        email: friendEmail,
        name: friendName
      });

      friend.save({}, {
        success: function(user) {
          var rsvp = new Rsvp({
            user_id: user.get('id'),
            event_id: this.model.get('id')
          })
          this.collection.create(rsvp);
        }.bind(this)
      });
    },
    render: function() {
      this.$el.html(this.template);
      var guestListView = new GuestListView({collection: this.collection, el: $('#guestlist-view')})
      // $('tbody[data-id="guestlist-table"]').html(guestListView.$el)
    }
  })

  var GuestListView = Backbone.View.extend({
    initialize: function(opts) {
      this.collection = opts.collection
      this.collection.each(this.addGuest)
      this.listenTo(this.collection, 'add', this.addGuest)
      this.render();
    },
    template: _.template($('script[data-id="guestlist-template"]').text()),
    addGuest: function(rsvpModel) {
      var user = new User({id: rsvpModel.get('user_id')});
      console.log(rsvpModel)
      user.fetch({
        success: function() {
          var rsvp = new RsvpTableView({model: user});
          rsvp.render();
          $('tbody[data-id="guestlist-table"]').append(rsvp.$el)
        }
      });
    },
    render: function() {
      this.$el.html(this.template);
    }

  });

  // ------------------------- Router -------------------------
  var Router = Backbone.Router.extend({
    initialize: function(currentUser) {
      this.currentUser = currentUser;
    },

    routes: {
      '': 'index',
      'create?location_id=:id': 'createFormView',
      'events/:event_id': 'showEventView'
    },
    index: function() {
      var locations = new LocationsCollection();
      window.locationsView = new LocationsCollectionView({
        el: $("#main"),
        collection: locations
      });
    },
    createFormView: function(id) {
      var eventModel = new Event();
      var rsvp = new Rsvp();

      var formView = new EventFormView({
        currentUser: this.currentUser,
        rsvp: rsvp,
        model: eventModel,
        location_id: id
      });
      this.listenTo(rsvp, 'sync', function(rsvp) {
        this.navigate('/events/' + rsvp.get('event_id'), true);
      }.bind(this))

      formView.render();
    },
    showEventView: function(event_id) {
      var barbecue = new Event({
        id: event_id
      });
      var rsvpCollection = new RsvpCollection({
        event_id: event_id
      })
      rsvpCollection.fetch();

      // var supplyCollection = new SupplyCollection({event_id: event_id})
      // supplyCollection.fetch();

      barbecue.fetch({
        success: function() {
          var barbecueView = new EventDetailsView({
            model: barbecue,
            user: this.currentUser,
            rsvpCollection: rsvpCollection,
            // supplyCollection: supplyCollection
          });
        }.bind(this)
      });
    }
  });

  $.getJSON('/sessions').done(function(user) {
    window.myRouter = new Router(new User(user));
    Backbone.history.start();
  });
});