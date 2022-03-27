import clock from 'clock'
import { me as device } from "device"
import { display } from 'display'
import document from 'document'
import { inbox } from "file-transfer"
import * as fs from 'fs'
import { HeartRateSensor } from "heart-rate"
import * as jpeg from "jpeg"
import { today } from 'user-activity'
import { units, preferences } from "user-settings"

//#region ******************************************************************************************* Global Data *****

const SCREEN_SIZE = device.screen.width
const imageEl = document.getElementById('image')
const hourEl = document.getElementById('hour')
const colonEl = document.getElementById('colon')
const minEl = document.getElementById('min')
const dateSecEl = document.getElementById('dateSec')
const iconEl = document.getElementById('icon')
const actEl = document.getElementById('act')
const touchEl = document.getElementById('touch')
const colonWidth
const ACTIVITY_TYPE = {ENERGY:0, STEPS:1, DIST:2, AZM:3, HEART:4}
const DIST_MULTIPLIER = units.distance==='us'? 0.000621371 : 0.001;  // conversion factor from metres to miles or km
const heartSensor
const iconX = [60,50,73,107,102] // iconEl.x for each ACTIVITY_TYPE
const DATA_DIR = '/private/data/'

let hourPrev, minPrev
let hourWidth, minWidth, datePrev
let heartStaleTimer
let state = {
  sec:        true,         // false=date
  activity:   0,            // ACTIVITY_TYPE currently displayed
  col:        '#40e0e0',       // non-white text colour
  background: undefined     // filename of background image
}

//#endregion

//#region ********************************************************************************************* Start-up *****

;(function() {
  restoreState()

  setCol()

  if (state.background)
    imageEl.href = DATA_DIR + state.background

  receiveFiles()
  inbox.onnewfile = receiveFiles

  heartSensor = new HeartRateSensor({ frequency: 1 })
  heartSensor.addEventListener("reading", onHeartReading)

  if (preferences.clockDisplay === '12h') {   // use larger font
    hourEl.style.fontSize = colonEl.style.fontSize = minEl.style.fontSize = 135
    document.getElementById('time').y = 216       // TODO 5 adapt to SDK4
    document.getElementById('div-upper').y = 88   // TODO 5 adapt to SDK4
    document.getElementById('div-lower').y = 236  // TODO 5 adapt to SDK4
  }

  colonWidth = colonEl.getBBox().width

  setSec(true)
  setActivity()

  clock.granularity = 'seconds'
  clock.ontick = evt => {onTick(evt.date)}

  touchEl.onclick = onTouch

  if (display.aodAvailable) display.aodAllowed = true
  display.onchange = onDisplayChange
})()

function setCol() {   // state.col changed
  dateSecEl.style.fill = colonEl.style.fill = actEl.style.fill = state.col
}

function setSec(firstRun) {   // state.sec changed
  if (state.sec && !firstRun) {
    dateSecEl.textAnchor = 'start'
    dateSecEl.x = SCREEN_SIZE / 2 - 35
  }
  if (!state.sec) {   // date
    dateSecEl.textAnchor = 'middle'
    dateSecEl.x = SCREEN_SIZE / 2
  }
}

function setActivity() {   // state.activity changed
  iconEl.href = state.activity + '.png'
  iconEl.x = iconX[state.activity]
  actEl.x = iconEl.x + 60

  if (state.activity === ACTIVITY_TYPE.HEART) {
    actEl.text = '—'
    heartSensor.start()
} else {
    stopHeartSensor()
  }
}

function stopHeartSensor() {
  heartSensor.stop()

  if (heartStaleTimer !== undefined) {
    clearTimeout(heartStaleTimer)
    heartStaleTimer = undefined
  }
}

//#endregion

//#region ********************************************************************************************** Running *****

function onTickNow() {
  onTick(new Date())
}

function onTick(now) {
  const hour = now.getHours()
  const min = now.getMinutes()

  //hour = 12   // TODO 8 SS: 21 or 12
  let timeChanged

  if (hour !== hourPrev) {
    hourPrev = hour
    hour = formatHour(hour)
    hourEl.text = hour
    hourWidth = hourEl.getBBox().width
    timeChanged = true

    if (!state.sec) {   // check date
      const date = now.getDate()
      if (date !== datePrev) {
        dateSecEl.text = date
        datePrev = date
      }
    }
  }

  //min = 38  // TODO 8 SS
  if (min !== minPrev) {
    minPrev = min
    minEl.text = zeroPad(min)
    minWidth = minEl.getBBox().width
    timeChanged = true
  }

  // Set time element x positions:
  if (timeChanged) {
    const hourX = (SCREEN_SIZE - hourWidth - colonWidth - minWidth) / 2   // TODO 9 subtract something to centre if shadowed
    hourEl.x = hourX
    colonEl.x = hourX + hourWidth
    minEl.x = colonEl.x + colonWidth
  }

  if (!display.aodActive) {
    const sec = now.getSeconds()
    //sec = 55  // TODO 8 SS
    if (state.sec) dateSecEl.text = zeroPad(sec)
    colonEl.style.display = sec%2? 'none' : 'inline'  // blink colon if not in AOD

    switch(state.activity) {
      case ACTIVITY_TYPE.ENERGY: actEl.text = today.adjusted.calories.toLocaleString(); break
      case ACTIVITY_TYPE.STEPS: actEl.text = today.adjusted.steps.toLocaleString(); break
      case ACTIVITY_TYPE.DIST: actEl.text = (today.adjusted.distance * DIST_MULTIPLIER).toFixed(2); break
      case ACTIVITY_TYPE.AZM: actEl.text = today.adjusted.activeZoneMinutes.total; break
    }
    //actEl.text = '1,329' // TODO 8 SS
  }
}

function formatHour(hr) {
  if (preferences.clockDisplay === '12h') {
    hr %= 12
    return hr? hr : 12
  }
  return zeroPad(hr)
}

function zeroPad(s) {
  return s <= 9? '0' + s : s
}

function onHeartReading() {
  if (heartStaleTimer !== undefined) clearTimeout(heartStaleTimer)
  heartStaleTimer = setTimeout(onHeartStale, 20000)  // TODO 8 20000
  actEl.text = heartSensor.heartRate
}

function onHeartStale() {
  heartStaleTimer = undefined
  actEl.text = '—'
}

//#endregion

//#region ********************************************************************************************** User Input *****

function onTouch(evt) {
  if (evt.screenY < SCREEN_SIZE / 2)
    toggleDateSec()
  else
    nextActivity()

  saveState()
}

function toggleDateSec() {
  state.sec = !state.sec
  setSec()
  hourPrev = datePrev = undefined   // ensure onTick() redisplays date
  onTickNow()
}

function nextActivity() {
  state.activity = (++state.activity) % (ACTIVITY_TYPE.HEART + 1)
  setActivity()
  onTickNow()
}

//#endregion

//#region **************************************************************************************** Display Change *****

function onDisplayChange() {
  if (display.aodAllowed && display.aodEnabled) { // entering or leaving AOD
    clock.granularity = display.aodActive? 'minutes' : 'seconds'
    dateSecEl.style.display = iconEl.style.display = actEl.style.display = imageEl.style.display = display.aodActive? 'none' : 'inline'
    if (display.aodActive) colonEl.style.display = 'inline'
    displayCommon(!display.aodActive && display.on)
  } else {
    displayCommon(display.on)
  }
}

function displayCommon(normal) {  // display.onchange stuff common to AOD and not AOD
  // normal: if non-AOD, display is coming on; if AOD, display is leaving AOD

  if (normal) {   // display going on or leaving AOD
    if (state.activity === ACTIVITY_TYPE.HEART) heartSensor.start()
  } else {    // not normal: display going off or into AOD
    if (state.activity === ACTIVITY_TYPE.HEART) stopHeartSensor()
  }
}

//#endregion

//#region ************************************************************************************************* Settings *****

function receiveFiles() {
  let fileName

  while (fileName = inbox.nextFile()) {
    let fileExtIndex, extension;
    fileExtIndex = fileName.lastIndexOf('.')
    extension = fileName.slice(fileExtIndex + 1)
    switch(extension) {
      case 'jpg': receiveImage(fileName); break
      case 'cbor': receiveSettings(fileName); break
    }
    fs.unlinkSync(fileName)
  }

  saveState()
}

function receiveImage(fileName) {
  if (state.background) fs.unlinkSync(state.background)  // delete previous image file, if any

  state.background = Date.now() + ".txi"
  jpeg.decodeSync(fileName, state.background, {overwrite:true})
  imageEl.href = DATA_DIR + state.background

}

function receiveSettings(fileName) {
  const settings = fs.readFileSync(fileName, 'cbor')
  let value

  for (let key in settings) {
    value = settings[key]

    switch(key) {
      case 'col':
        state.col = value
        setCol()
        break
      case 'background-none':
        if (state.background) fs.unlinkSync(state.background)  // delete previous image file, if any
        state.background = undefined
        imageEl.href = ''
        break
    }
  }
}

//#endregion

//#region **************************************************************************************************** State *****

function saveState() {
  fs.writeFileSync("state.cbor", state, "cbor")
}

function restoreState() {
  // Returns true if state restored.
  let newState;
  try {
    newState = fs.readFileSync("state.cbor", "cbor");
    state = newState;
    return true
  } catch(err) {   // leave state as is
  }
}

//#endregion

// TODO 9 pro version: background image optional vignette and lighten/darken (cf. Eat Me); dark text theme; shadowed text; arbitrary colour sliders; selectable activity types