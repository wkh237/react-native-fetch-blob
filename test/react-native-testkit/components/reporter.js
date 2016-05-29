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
import RNTEST from '../index.js'

export default class Reporter extends Component {

  render() {
    return (
      <ScrollView key="rn-test-scroller" style={styles.container}>
        {this.renderTests()}
      </ScrollView>)
  }

  renderTests() {
    let tests = RNTEST.TestContext.getTests()
    return tests.map((t, i) => {

      let pass = true
      let foundActions = false

      if(Array.isArray(t.result) && !t.expired) {
        t.result = t.result.map((r) => {
          if(r.type.name === 'Assert' || r.type.name === 'Info') {
            foundActions = true
            let comp = r.props.comparer ? r.props.comparer(r.props.expect, r.props.actual) : (r.props.actual === r.props.expect)
            pass = pass && comp
          }
          return React.cloneElement(r, {desc : r.key})
        })
      }
      if(tests[i].running)
        t.status = 'running'
      else if(tests[i].executed) {
        t.status = foundActions ? (pass ? 'pass' : 'fail') : 'skipped'
        t.status = t.expired ? 'timeout' : t.status
      }
      else
        t.status = 'waiting'

      return (<View key={'rn-test-' + t.desc} style={{
        borderBottomWidth : 1.5,
        borderColor : '#DDD',
      }}>
        <View key={t.desc} style={{
          alignItems : 'center',
          flexDirection : 'row'
        }}>
          <Text style={[styles.badge, {flex : 1, borderWidth : 0, textAlign : 'left'}]}>{t.desc}</Text>
          <Text style={[styles.badge, this.getBadge(t.status)]}>{t.status}</Text>
        </View>
        <View key={t.desc + '-result'} style={{backgroundColor : '#F4F4F4'}}>
          {t.result}
        </View>
      </View>)
    })
  }

  getBadge(status: 'waiting' | 'running' | 'pass' | 'fail' | 'timeout') {
    return styles[status]
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
    textAlign : 'center'
  },
  skipped: {
    borderColor : '#AAAAAA',
    color : '#AAAAAA'
  },
  waiting: {
    borderColor : '#AAAAAA',
    color : '#AAAAAA'
  },
  pass: {
    borderColor : '#00a825',
    color : '#00a825'
  },
  running: {
    borderColor : '#e3c423',
    color : '#e3c423'
  },
  fail: {
    borderColor : '#ff0d0d',
    color : '#ff0d0d'
  },
  timeout: {
    borderColor : '#ff0d0d',
    color : '#ff0d0d'
  }
});
