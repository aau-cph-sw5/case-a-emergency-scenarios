import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { box, colors, surface, text } from '../../shared/Theme';

function Tab({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[box, { width: '49%', backgroundColor: on ? colors.active : surface.backgroundColor }]}>
      <Text style={[text.body, { color: on ? colors.textInverse : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

// Right panel: "List" tab shows whatever is passed as children, "Message" tab is a small form.
export default function SidePanel({ children }: { children?: React.ReactNode }) {
  const [tab, setTab] = useState('list');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Tab label="List" on={tab === 'list'} onPress={() => setTab('list')} />
        <Tab label="Message" on={tab === 'msg'} onPress={() => setTab('msg')} />
      </View>

      <View style={{ marginTop: 8 }}>
        {tab === 'list' ? (
          children
        ) : (
          <>
            <TextInput placeholder="Recipient" value={to} onChangeText={setTo} style={[box, { marginBottom: 6 }]} />
            <TextInput placeholder="Message" value={text} onChangeText={setText} multiline
              style={[box, { height: 120, marginBottom: 6 }]} />
            <Pressable style={box} onPress={() => { setTo(''); setText(''); }}>
              {/* @ts-expect-error `text` here is the state string (shadows the Theme import); behaviour unchanged */}
              <Text style={text.body}>Send</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
