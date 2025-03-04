import {useState} from 'react'
import {Keyboard, View, Text, TouchableOpacity} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {StyleSheet} from 'react-native'
import {colors} from '#/lib/styles'

import {atoms as a, native, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {Swarm_Stroke2_Corner0_Rounded} from '#/components/icons/Swarm'
import {applySwarmCommunityLabel} from '#/labels/label_defs'
import {useAgent} from '#/state/session'

/**
 * SwarmCommunityBtn Component
 * 
 * This component provides a button in the post composer to add the post to the Swarm community.
 * When enabled, it will apply the "swarm-community" label to the post.
 */
interface SwarmCommunityBtnProps {
  isEnabled: boolean
  onChange: (enabled: boolean) => void
}

export function SwarmCommunityBtn({isEnabled, onChange}: SwarmCommunityBtnProps) {
  const control = Dialog.useDialogControl()
  const {_} = useLingui()

  return (
    <>
      <TouchableOpacity
        testID="swarmCommunityToggleBtn"
        style={styles.container}
        onPress={() => {
          Keyboard.dismiss()
          control.open()
        }}
        accessibilityRole="button"
        accessibilityLabel={isEnabled ? 'Disable Swarm community' : 'Enable Swarm community'}
        accessibilityHint="Toggles whether this post appears in the Swarm community feed">
        <View style={styles.iconContainer}>
          <Swarm_Stroke2_Corner0_Rounded
            size="md"
            style={[styles.icon, isEnabled && styles.activeIcon]}
          />
        </View>
        <Text style={[styles.label, isEnabled && styles.activeLabel]}>
          {isEnabled ? (
            <Trans>Swarm Community</Trans>
          ) : (
            <Trans>Add to Swarm</Trans>
          )}
        </Text>
      </TouchableOpacity>

      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <DialogInner isEnabled={isEnabled} onChange={onChange} />
      </Dialog.Outer>
    </>
  )
}

function DialogInner({
  isEnabled,
  onChange,
}: {
  isEnabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const {_} = useLingui()
  const theme = useTheme()

  return (
    <View style={a.p_lg}>
      <Text style={[a.font_bold, a.mb_md]}>
        <Trans>Add to Swarm Community</Trans>
      </Text>
      <Text style={[a.mb_lg]}>
        <Trans>
          Adding your post to the Swarm community will make it visible in the
          Swarm feed, which is the main community feed of the platform.
        </Trans>
      </Text>

      <View style={[a.flex_row, a.align_center, a.mb_md]}>
        <Button
          variant={isEnabled ? 'solid' : 'outline'}
          color={isEnabled ? 'primary' : 'secondary'}
          size="small"
          onPress={() => onChange(!isEnabled)}
          label={_(msg`Toggle Swarm community`)}
          accessibilityHint={_(
            msg`Toggles whether to add your post to the Swarm community`,
          )}>
          <ButtonIcon icon={isEnabled ? Check : Swarm_Stroke2_Corner0_Rounded} />
          <ButtonText>
            {isEnabled ? (
              <Trans>Added to Swarm</Trans>
            ) : (
              <Trans>Add to Swarm</Trans>
            )}
          </ButtonText>
        </Button>
      </View>

      <Text style={[a.text_sm, theme.atoms.text_contrast_medium]}>
        <Trans>
          Posts in the Swarm community are subject to community guidelines.
        </Trans>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  iconContainer: {
    marginRight: 8,
  },
  icon: {
    color: colors.gray4,
  },
  activeIcon: {
    color: colors.blue3,
  },
  label: {
    fontSize: 16,
    color: colors.gray4,
  },
  activeLabel: {
    color: colors.blue3,
  },
})

/**
 * Hook to manage the Swarm community label state
 * This hook provides a state and handlers for the Swarm community button
 */
export function useSwarmCommunity() {
  const [isSwarmCommunity, setIsSwarmCommunity] = useState(false)
  const agent = useAgent()

  // Function to apply the swarm-community label to a post
  const applySwarmCommunityLabelToPost = async (postUri: string) => {
    if (isSwarmCommunity && agent) {
      try {
        await applySwarmCommunityLabel(agent, postUri)
        console.log('Applied swarm-community label to post:', postUri)
      } catch (error) {
        console.error('Failed to apply swarm-community label:', error)
      }
    }
  }

  return {
    isSwarmCommunity,
    setIsSwarmCommunity,
    applySwarmCommunityLabelToPost,
  }
} 