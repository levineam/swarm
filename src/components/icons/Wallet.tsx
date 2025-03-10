import {Path, Svg} from 'react-native-svg'

import {Props} from './common'

export function Wallet_Stroke2_Corner0_Rounded({
  size = 'md',
  fill,
  style,
  ...props
}: Props) {
  return (
    <Svg
      width={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      height={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      {...props}>
      <Path
        d="M18 8H21C21.5523 8 22 8.44772 22 9V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H18C18.5523 4 19 4.44772 19 5V7C19 7.55228 18.5523 8 18 8Z"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 14C16 12.8954 16.8954 12 18 12C19.1046 12 20 12.8954 20 14C20 15.1046 19.1046 16 18 16C16.8954 16 16 15.1046 16 14Z"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function Wallet_Filled_Corner0_Rounded({
  size = 'md',
  fill,
  style,
  ...props
}: Props) {
  return (
    <Svg
      width={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      height={size === 'sm' ? 18 : size === 'md' ? 24 : 32}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      {...props}>
      <Path
        d="M18 8H21C21.5523 8 22 8.44772 22 9V19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19V5C2 4.44772 2.44772 4 3 4H18C18.5523 4 19 4.44772 19 5V7C19 7.55228 18.5523 8 18 8Z"
        fill={fill}
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 14C16 12.8954 16.8954 12 18 12C19.1046 12 20 12.8954 20 14C20 15.1046 19.1046 16 18 16C16.8954 16 16 15.1046 16 14Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
