// @flow
import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default class Info extends Component {

  props : {
    description : string,
  }

  render() {
    return (
      <View style={{
        borderTopWidth :1 ,
        alignItems : 'center',
        borderTopColor : '#DDD'
      }}>
        <View style={{ alignSelf : 'stretch'}}>
          <Text style={{color : '#777', alignSelf : 'stretch', textAlign : 'center', margin : 8}}>
            {this.props.description}
          </Text>
        </View>
        <View style={{alignSelf : 'stretch'}}>{this.props.children}</View>
      </View>
    )
  }

}
