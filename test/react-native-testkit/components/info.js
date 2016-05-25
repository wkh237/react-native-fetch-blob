import React, {Component} from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default class Info extends Component {

  props : {
    desc : string,
  };

  render() {
    return (
      <View style={{
        borderTopWidth :1 ,
        alignItems : 'center',
        borderTopColor : '#DDD'
      }}>
        <View style={{ alignSelf : 'stretch'}}>
          <Text style={{color : '#777', alignSelf : 'stretch', textAlign : 'center', margin : 8}}>
            {this.props.desc}
          </Text>
        </View>
        <View style={{margin : 8, alignSelf : 'stretch'}}>{this.props.children}</View>
      </View>
    )
  }

}
