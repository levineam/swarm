import React from 'react'
import Svg, {Path} from 'react-native-svg'

import {Props, useCommonSVGProps} from '#/components/icons/common'

export const Swarm_Stroke2_Corner0_Rounded = React.forwardRef<Svg, Props>(
  function SwarmIcon(props, ref) {
    const {fill, size, style, ...rest} = useCommonSVGProps(props)

    return (
      <Svg
        fill="none"
        {...rest}
        ref={ref}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={[style]}>
        <Path
          stroke={fill}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2L2 7L12 12L22 7L12 2Z"
        />
        <Path
          stroke={fill}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 17L12 22L22 17"
        />
        <Path
          stroke={fill}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 12L12 17L22 12"
        />
      </Svg>
    )
  }
) 