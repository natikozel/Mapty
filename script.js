'use strict';

class Workout {

  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;


  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  click() {
    this.clicks++;
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {

  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {

  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
      alert('Could not get your location');
    });
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    this.#map = L.map('map').setView([latitude, longitude], 13);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(w => {
      this._renderWorkoutMarker.call(this, w);
    });
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField(e) {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const checkNum = inputs => inputs.every(field => Number.isFinite(field));
    const checkPositivity = inputs => inputs.every(field => field > 0);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const allFields = [+inputDistance.value, +inputDuration.value];

    if (inputType.value === 'running') {
      allFields.push(+inputCadence.value);
      if (!checkNum(allFields) || !checkPositivity(allFields))
        return alert('Inputs have to be positive numbers!');
      workout = new Running([lat, lng], ...allFields);
    }
    if (inputType.value === 'cycling') {
      allFields.push(+inputElevation.value);
      if (!checkNum(allFields) || !checkPositivity(allFields.slice(0, -1)))
        return alert('Inputs have to be positive numbers! (except the Elev gain)');
      workout = new Cycling([lat, lng], ...allFields);
    }
    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._hideForm();
    this._setLocalStorage();

  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords).addTo(this.#map)
      .bindPopup(L.popup({
        maxWidth: 250,
        minWidth: 100,
        autoClose: false,
        closeOnClick: false,
        className: `${workout.type}-popup`
      }))
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `<li class='workout workout--${workout.type}' data-id='${workout.id}'>
          <h2 class='workout__title'>${workout.description}</h2>
          <div class='workout__details'>
            <span class='workout__icon'>${workout.type === 'running' ? '🏃‍️' : '🚴'}</span>
            <span class='workout__value'>${workout.distance}</span>
            <span class='workout__unit'>km</span>
          </div>
          <div class='workout__details'>
            <span class='workout__icon'>⏱</span>
            <span class='workout__value'>${workout.duration}</span>
            <span class='workout__unit'>min</span>
          </div>`;
    if (workout.type === 'running') {
      html += `<div class='workout__details'>
            <span class='workout__icon'>⚡️</span>
            <span class='workout__value'>${workout.pace.toFixed(1)}</span>
            <span class='workout__unit'>min/km</span>
          </div>
          <div class='workout__details'>
            <span class='workout__icon'>🦶🏼</span>
            <span class='workout__value'>${workout.cadence}</span>
            <span class='workout__unit'>spm</span>
          </div>
        </li>`;
    } else {
      html += `<div class='workout__details'>
            <span class='workout__icon'>⚡️</span>
            <span class='workout__value'>${workout.speed.toFixed(1)}</span>
            <span class='workout__unit'>km/h</span>
          </div>
          <div class='workout__details'>
            <span class='workout__icon'>⛰</span>
            <span class='workout__value'>${workout.elevationGain}</span>
            <span class='workout__unit'>m</span>
          </div>
        </li> `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  _moveToPopup(e) {
    const target = e.target.closest('.workout');
    if (!target) return;
    const workout = this.#workouts.find(w => w.id === target.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
   // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data)
      return;
    this.#workouts = data;
    this.#workouts.forEach(w => {
      this._renderWorkout(w);
    });

  }

  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
