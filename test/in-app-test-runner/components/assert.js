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

export default class Assert extends Component {

  props : {
    expect : any,
    actual : any,
    desc : any,
    compaer : () => bool
  };

  constructor(props) {
    super(props)
  }

  render() {
    return (
      <View style={{
        padding : 16,
        borderLeftWidth : 5,
        marginTop : 4,
        backgroundColor : 'white',
        borderColor : this.getAssertion() ? '#00a825' : '#ff0d0d'
      }}>
        <Text style={{
          color : this.getAssertion() ? '#00a825' : '#ff0d0d',
          margin : 8,
          marginTop : 0,
          marginLeft : 0
        }}>{ this.getAssertion() ? '✅' : '×' } {this.props.desc}</Text>
        <Text style={{flex : 1, flexDirection : 'row'}}>
          <Text style={{ color : '#AAA'}}>expect </Text>
          <Text style={{flex : 1}}>{String(this.props.expect)}</Text>
        </Text>
        <Text style={{flex : 1, flexDirection : 'row'}}>
          <Text style={{color : '#AAA'}}>actual  </Text>
          <Text style={{flex : 1}}>{String(this.props.actual)}</Text>
        </Text>
        {this.props.comparer ? <Text style={{flex : 1, flexDirection : 'row'}}>
          <Text style={{color : '#AAA'}}>comparer = </Text>
          <Text style={{flex : 1}}>
            { String(this.props.comparer) }
          </Text>
        </Text> : null}
      </View>
    )
  }

  getAssertion() {
    if(this.props.comparer)
      return this.props.comparer(this.props.expect, this.props.actual)
    else
      return this.props.expect === this.props.actual
  }

}
