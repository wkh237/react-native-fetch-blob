/**
 * Sample RNTestkit App
 * @flow
 */
import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Platform,
  ScrollView,
  CameraRoll,
  Image,
} from 'react-native';

import RNTest from './react-native-testkit/'
import './test-init'

class fetchblob extends Component {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    RNTest.run(this)
  }

  render() {
    return <RNTest.Reporter />
  }

}



AppRegistry.registerComponent('RNFetchBlobTest', () => fetchblob);
