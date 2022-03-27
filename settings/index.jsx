function mySettings(props) {
  let screenWidth = props.settingsStorage.getItem("screenWidth");
  let screenHeight = props.settingsStorage.getItem("screenHeight");

  return (
    <Page>
      <Section title={<Text bold align="center">COLOUR</Text>}>
        <ColorSelect
          settingsKey="col"
          colors={[
            {color: '#ff6060'},
            {color: '#ffa040'},
            {color: '#e0e040'},
            {color: '#a0ff40'},
            {color: '#60ff60'},
            {color: '#40ffa0'},
            {color: '#40e0e0'},
            {color: '#40a0ff'},
            {color: '#6060ff'},
            {color: '#a040ff'},
            {color: '#e040e0'},
            {color: '#ff40a0'}
          ]}
        />
      </Section>
      <Section title={
        <Text bold align="center">
          BACKGROUND IMAGE
        </Text>
      }>
        <ImagePicker
          label="Current Image"
          sublabel="Touch to change"
          settingsKey="background-image"
          imageWidth={ screenWidth }
          imageHeight={ screenHeight }
        />
        <Button
          label="None"
          onClick={() => {
            props.settingsStorage.removeItem('background-image')
            props.settingsStorage.setItem('background-none', 'true')
          }}
        />
      </Section>
      <Section title={<Text bold align="center">HELP</Text>}>
        <Text>● Touch top of watch screen to swap date and seconds.</Text>
        <Text>● Touch bottom of watch screen to change activity.</Text>
        <Text>● For more help, see <Link source="https://gondwanasoftware.net.au/fitbit/products/big-time">BIG TIME’s web page</Link>.</Text>
        <Text>● For more features, see <Link source="https://gallery.fitbit.com/details/fc0c3244-b25c-473c-ad94-0b7ae1851d50">BIG TIME Pro</Link>.</Text>
      </Section>
    </Page>
  );
}

registerSettingsPage(mySettings)