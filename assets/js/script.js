var map;

// Make the API call to Yelp
async function getYelpData(yelpURL) {
  try {
    // thanks Caleb
    var baseURL = "https://yelp-server-caleb-crum.herokuapp.com/api?url=";
    var url = baseURL + encodeURIComponent(yelpURL);

    var res = await fetch(url);
    var data = await res.json();

    handleAPICall(data.businesses);
  } catch (err) {
    console.log(err);
  }
}

// Yelp API call will return information about 18 restaurants (6 cards on each row)
// For each restaurant, the card will display information about the name, phone number,
// address, cost, rating and review count
function handleAPICall(input) {
  for (let i = 0; i < input.length; i++) {
    let phoneNum = displayValue(input[i].display_phone);
    phoneNum = phoneNum.replace(/\D/g,'');
    phoneNum = phoneNum.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    let priceText = displayValue(input[i].price);
    let ratingText = displayValue(input[i].rating);
    let reviewCountText = displayValue(input[i].review_count);
    let address1 = displayValue(input[i].location.display_address[0]);
    let address2 = displayValue(input[i].location.display_address[1]);
    function displayValue(value) {
      if (typeof value === 'undefined') {
        return 'N/A';
      }
      return value;
    }
    
    // create each card and append it to the cards container
    $("#cards").append(
      `
      
        <div class="col s12 m4 l3 xl2" style="min-height: 473.5px;">
          <div class="card">
            <div class="card-image">
              <img style="max-height: 190px; min-height: 190px; object-fit: cover; height: auto;" src="${input[i].image_url}">
              <span class="card-title" style="text-shadow: 2px 2px 2px rgba(0,0,0,0.3); font-weight: normal;">${input[i].name}</span>
            </div>
            <div class="card-content">
                <ul>
                  <li style="font-size: 18px;">Price: ${priceText}</li>
                  <li style="font-size: 18px;">Rating: ${ratingText}<i class="material-icons inline-icon md-18">star_rate</i></li>
                  <li style="font-size: 15px;">${reviewCountText} reviews</li>
                </ul>
            </div>
            <div class="card-action" style="min-height: 114px; max-height: 114px;">
              <i class="material-icons md-18 inline-icon">call</i>
              <a href="tel:${phoneNum}" style="font-size: 18px;">${phoneNum}</a> <br>
              <a class="restaurant-address" href="#" style="font-size: 15px;">${address1} ${address2}</a>
            </div>
          </div>
        </div>`
    );
    
    // create an info window when a moouse is hovering over a pin
    const contentString = `<h6>${input[i].name}</h6>`;
    const infowindow = new google.maps.InfoWindow({
      content: contentString,
      ariaLabel: input[i].name,
    });
    
    // create pins to represent resturants in the search area
    const marker = new google.maps.Marker({
      position: { lat: input[i].coordinates.latitude, lng: input[i].coordinates.longitude },
      map: map,
      title: input[i].name
    });

    // info window only shows when being hovered over
    // pin is removed when mouse moves away
    marker.addListener("mouseover", () => {
      infowindow.open({
        anchor: marker,
        map,
      });
    });
    marker.addListener("mouseout", () => {
      infowindow.close();
    });
  }

  // when user click on an address on the restaurant card, the map will move to that location and zoom in
  const restaurantAddress = document.querySelectorAll(".restaurant-address");
  restaurantAddress.forEach(function (address) {
    address.addEventListener("click", function (event) {
      event.preventDefault();
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { address: address.textContent },
        function (results, status) {
          if (status === "OK") {
            map.setCenter(results[0].geometry.location);
            map.setZoom(18);
            new google.maps.Marker({
              map: map,
              position: results[0].geometry.location,
            });
          } else {
            alert(
              "Geocode was not successful for the following reason: " + status
            );
          }
        }
      );
    });
  });
}

var nashville = { lat: 36.1627, lng: -86.7816 };

// Adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
function initAutocomplete() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: nashville,
    zoom: 12,
    mapTypeId: "roadmap",
    disableDefaultUI: true,
    scaleControl: true,
    zoomControl: true,
  });
  // Create the search box and link it to the UI element.
  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);
  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });
  let markers = [];
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();
    map.setZoom(20);
    if (places.length == 0) {
      return;
    }
    // Clear out the old markers.
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    markers = [];
    $('#cards').html(``);
    // For each place, get the icon, name and location.
    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }
      const icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25),
      };
      var cityName = `${place.name}`;
      getYelpData(
        "https://api.yelp.com/v3/businesses/search?location=" +
          cityName +
          "&term=restaurants&sort_by=best_match&limit=18"
      );
      // Create a marker for each place.
      markers.push(
        new google.maps.Marker({
          map,
          icon,
          title: place.name,
          position: place.geometry.location,
        })
      );

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);
    map.setZoom(12);
  });
}

window.initAutocomplete = initAutocomplete;
