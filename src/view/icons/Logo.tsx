import React from 'react'
import {StyleSheet, TextProps} from 'react-native'
import Svg, {Circle, PathProps, SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'

import {colors} from '#/lib/styles'
import {useKawaiiMode} from '#/state/preferences/kawaii'

type Props = {
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = React.forwardRef(function LogoImpl(props: Props, ref) {
  const {fill, ...rest} = props
  const gradient = fill === 'sky'
  const styles = StyleSheet.flatten(props.style)
  const _stroke = gradient ? 'url(#sky)' : fill || styles?.color || colors.white
  // @ts-expect-error
  const size = parseInt(rest.width || 32, 10)

  const isKawaii = useKawaiiMode()

  if (isKawaii) {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel="Bluesky"
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  return (
    <Svg
      // @ts-expect-error
      ref={ref}
      viewBox="0 0 26 26"
      {...rest}
      style={[{width: size, height: size}, styles]}>
      <Circle
        cx="13"
        cy="13"
        r="4"
        stroke={_stroke}
        strokeWidth="2"
        fill="none"
      />
      <Circle
        cx="13"
        cy="13"
        r="8"
        stroke={_stroke}
        strokeWidth="2"
        fill="none"
      />
      <Circle
        cx="13"
        cy="13"
        r="12"
        stroke={_stroke}
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  )
})
