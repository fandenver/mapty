'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllWorkoutsBtn = document.querySelector('.btn-delete-all-workout');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  type;
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const type = this.type === 'running' ? 'Бег' : 'Велопробег';

    this.description = `${type} - ${months[this.date.getMonth()]}, ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
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
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #workouts = [];
  #editId;

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    deleteAllWorkoutsBtn.addEventListener(
      'click',
      this._removeAllBtn.bind(this),
    );
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener(
      'click',
      this._actionWithWorkout.bind(this),
    );
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Не удалось определить ваше местоположение');
        },
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(
      this.#map,
    );

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    let lat;
    let lng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (!this.#editId) {
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    }

    let workout;

    e.preventDefault();

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('В поле должны быть положительные числа');

      workout = new Running(
        !this.#editId ? [lat, lng] : this.#editId.coords,
        distance,
        duration,
        cadence,
      );
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('В поле должны быть положительные числа');

      workout = new Cycling(
        !this.#editId ? [lat, lng] : this.#editId.coords,
        distance,
        duration,
        elevation,
      );
    }

    if (this.#editId) {
      workout.id = this.#editId.id;
      workout.date = this.#editId.date;
      this.#workouts.splice(this.#workouts.indexOf(this.#editId), 1, workout);
    } else {
      this.#workouts.push(workout);
      this._renderWorkout(workout);
    }

    this._renderWorkoutMarker(workout);
    this._hideForm();
    this._setLocalStorage();

    this.#editId = undefined;
    containerWorkouts.querySelectorAll('li').forEach(li => li.remove());
    this._getLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'}${workout.description}️`,
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `

    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__features">
              <div class="workout__feature workout__edit"></div>
              <div class="workout__feature workout__delete"></div>
          </div>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴'}️</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱️</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">мин</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">мин/км</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">шаг</span>
          </div>
        </li>
    `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">км/ч</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔️</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">м</span>
          </div>
        </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _actionWithWorkout(e) {
    this._showEditForm(e);
    this._deleteWorkout(e);

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl || e.target.classList.contains('workout__feature')) return;

    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    console.log(workout);
    workout.click();
  }

  _showEditForm(e) {
    if (!e.target.classList.contains('workout__edit')) return;

    const workoutEl = e.target.closest('.workout');

    const workToEdit = this.#workouts.find(
      work => work.id === workoutEl.dataset.id,
    );

    containerWorkouts
      .querySelectorAll('li')
      .forEach(li => li.classList.add('hidden'));

    this._showForm();

    this.#editId = workToEdit;
  }

  _deleteWorkout(e) {
    if (!e.target.classList.contains('workout__delete')) return;

    const choice = confirm('Вы уверены, что хотите удалить тренировку?');

    if (!choice) return;

    const workoutEl = e.target.closest('.workout');

    const workToDelete = this.#workouts.find(
      work => work.id === workoutEl.dataset.id,
    );

    this.#workouts.splice(this.#workouts.indexOf(workToDelete), 1);
    this._setLocalStorage();
    location.reload();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data.map(work => {
      if (work.type === 'running') {
        const obj = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence,
        );
        obj.id = work.id;
        obj.date = work.date;
        return obj;
      } else if (work.type === 'cycling') {
        const obj = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain,
        );
        obj.id = work.id;
        obj.date = work.date;
        return obj;
      }
    });

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _removeAllBtn() {
    if (!this.#workouts.length) return;

    const choice = confirm('Вы уверены, что хотите удалить все тренировки?');

    if (!choice) return;

    this.#workouts = [];
    this._setLocalStorage();
    location.reload();
  }
}

const app = new App();
