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

import Assert from './assert.js'

export default class Reporter extends Component {

  render() {
    return (
      <ScrollView key="rn-test-scroller" style={styles.container}>
        {this.renderTests()}
      </ScrollView>)
  }

  renderTests() {
    return this.props.context.tests.map((t, i) => {

      let pass = true
      let foundAssertions = false

      Array.isArray(t.result) && t.result.forEach((r) => {
        if(r.type.name === 'Assert') {
          foundAssertions = true
          pass = pass && (r.props.actual === r.props.expect)
        }
      })

      t.status = foundAssertions ? (pass ? 'pass' : 'fail') : t.status

      return (<View key={'rn-test-' + t.desc} style={{
        borderBottomWidth : 1.5,
        borderColor : '#DDD',
      }}>
        <View key={t.desc} style={{
          alignItems : 'center',
          flexDirection : 'row'
        }}>
          <Text style={[styles.badge, {flex : 1, borderWidth : 0}]}>{t.desc}</Text>
          <Text style={[styles.badge, this.getBadge(t.status)]}>{t.status}</Text>
        </View>
        <View key={t.desc + '-result'} style={{backgroundColor : '#F4F4F4'}}>
          {t.result}
        </View>
      </View>)
    })
  }

  getBadge(status) {
    if(status === 'running')
      return styles.badgeRunning
    else if(status === 'pass')
      return styles.badgePass
    else
      return styles.badgeFail
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop : 40,
  },
  badge : {
    margin : 16,
    padding : 4,
    borderRadius : 4,
    borderWidth : 2,
  },
  badgePass: {
    borderColor : '#00a825',
    color : '#00a825'
  },
  badgeRunning: {
    borderColor : '#e3c423',
    color : '#e3c423'
  },
  badgeFail: {
    borderColor : '#ff0d0d',
    color : '#ff0d0d'
  }
});
