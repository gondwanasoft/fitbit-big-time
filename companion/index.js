import { encode } from 'cbor'
import { me } from "companion"
import { outbox } from "file-transfer"
import { Image } from "image"
import { device } from "peer"
import { settingsStorage } from "settings"

;(function() {
  settingsStorage.setItem("screenWidth", device.screen.width)
  settingsStorage.setItem("screenHeight", device.screen.height)

  setDefaultSetting('col', '"#40e0e0"')

  if (me.launchReasons.settingsChanged) getAndSendAllSettings()
  settingsStorage.onchange = onSettingsChange
})()

function setDefaultSetting(key, value) {
  let extantValue = settingsStorage.getItem(key)
  if (extantValue === null) {
    if (typeof(value) === 'object') value = JSON.stringify(value)
    //console.log(`setDefaultSetting(): setting ${key} to ${value}`)
    settingsStorage.setItem(key, value)
  }
}

function getAndSendAllSettings() {
  let settings = {}

  if (Object.keys(settings).length) sendSettings(settings)
}

function onSettingsChange(evt) {
  if (evt.key === "background-image") {
    compressAndTransferImage(evt.newValue)
  } else {
    let setting = {}
    if (addSetting(setting, evt.key)) sendSettings(setting)
  }
}

function addSetting(settings, key) {
  // Returns true if any settings were added.
  //console.log(`addSetting(): key=${key} initialised=${settingsStorage.getItem('initialised')} ready=${settingsStorage.getItem('ready')}`)

  let item = settingsStorage.getItem(key)
  if (item === undefined || item === null) return
  //console.log(`addSetting(): ${key}=${item} (${typeof item})`)
  let value
  switch(key) {
    case 'col':
      value = item.substring(1,8)
      break
  }

  settings[key] = value
  return true
}

function sendSettings(settings) {
  //console.log(`sendSettings: ${JSON.stringify(settings)} [${Object.keys(settings).length}]`);
  if (settings !== undefined) {
    outbox.enqueue(Date.now()+'.cbor', encode(settings))
  }
}

function compressAndTransferImage(settingsValue) {
  if (!settingsValue) return    // assume we're removing the image

  const imageData = JSON.parse(settingsValue)
  Image.from(imageData.imageUri)
    .then(image =>
      image.export("image/jpeg", {
        background: "#FFFFFF",
        quality: 80
      })
    )
    .then(buffer => outbox.enqueue(`${Date.now()}.jpg`, buffer))
    .then(fileTransfer => {
    })
}