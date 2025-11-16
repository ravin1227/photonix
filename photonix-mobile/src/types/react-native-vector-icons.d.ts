declare module 'react-native-vector-icons/Ionicons' {
  import {Component} from 'react';
  import {TextProps, TextStyle} from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle | TextStyle[];
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons' {
  export * from 'react-native-vector-icons/Ionicons';
}

