/**
 * Sample React Native App
 * https://github.com/facebook/react-native
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
  Image,
} from 'react-native';

import RNTest from './react-native-testkit/'
import TestContext from './tests'


class fetchblob extends Component {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    TestContext.run(this)
  }

  render() {

    return (
      <RNTest.Reporter key="test-container" context={TestContext}/>
    )
  }

}



AppRegistry.registerComponent('RNFetchBlobTest', () => fetchblob);
