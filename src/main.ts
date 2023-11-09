import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board";
import { GeoCoin } from "./board";
//commented out for commit

let playerLatLang: leaflet.LatLng = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});
//const NULL_ISLAND: leaflet.LatLng = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL: number = 18.5;
const TILE_DEGREES: number = 1e-4;
const NEIGHBORHOOD_SIZE: number = 8;
const PIT_SPAWN_PROBABILITY: number = 0.1;
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const mapContainer: HTMLElement = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: playerLatLang,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

let myInventory: GeoCoin[] = [];
const playerMarker: leaflet.Marker<any> = leaflet.marker(playerLatLang);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// buttons for live player location
const sensorButton: Element = document.querySelector("#sensor")!;

sensorButton.addEventListener("click", () => {
  let watchId: number = navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    navigator.geolocation.clearWatch(watchId);
    map.setView(playerMarker.getLatLng());
    playerLatLang = playerMarker.getLatLng();

    createCache(playerLatLang);
  });
});

let coinCollected: number = 0;
const statusPanel: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Nothing to see here... yet";

const inventory: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#inventory")!;
inventory.innerHTML = "Inventory: ";

function makeGeocacheLocation(i: number, j: number) {
  const newCell: Cell = { i, j };
  const geocacheCoins: GeoCoin[] = [];
  const newBounds = board.getCellBounds(newCell);
  let value = Math.floor(luck([i, j, "initialValue"].toString()) * 6);

  for (let k = 0; k < value; k++) {
    const serial = "#" + (k + 1).toString();
    const newCoin: GeoCoin = { i, j, serial };
    console.log(newCoin.i);
    geocacheCoins.push(newCoin);
  }

  const pit = leaflet.rectangle(newBounds) as leaflet.Layer;

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>
                <p id="playerLocation">playerLocation</p>`;
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

    poke.addEventListener("click", () => {
      if (value > 0) {
        value--;
        myInventory.push(geocacheCoins.pop()!);
        coinCollected++;
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      showInventory();
      statusPanel.innerHTML = `${coinCollected} coins accumulated`;
    });

    deposit.addEventListener("click", () => {
      if (coinCollected > 0) {
        const depositCoin: GeoCoin = myInventory.pop()!;
        geocacheCoins.push(depositCoin);
        coinCollected--;
        value++;
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      showInventory();
      statusPanel.innerHTML = `${coinCollected} points accumulated`;
    });

    container.querySelector<HTMLSpanElement>(
      "#playerLocation"
    )!.innerHTML = `Player Location: ${playerLatLang.toString()}`;

    return container;
  });

  pit.addTo(map);
}

function createCache(location: leaflet.LatLng) {
  const playerCell: Cell = board.getCellForPoint(location);

  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
        makeGeocacheLocation(playerCell.i + i, playerCell.j + j);
      }
    }
  }
}

function showInventory() {
  inventory.innerHTML = "Inventory: " + "<br/>";
  console.log(myInventory.length);
  for (let k = 0; k < myInventory.length; k++) {
    inventory.innerHTML +=
      "🦃 " +
      myInventory[k].i.toString() +
      ": " +
      myInventory[k].j.toString() +
      myInventory[k].serial.toString() +
      "<br/>";
  }
}

createCache(playerLatLang);
