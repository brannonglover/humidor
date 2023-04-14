import { useQuery } from '@apollo/client';
import { StyleSheet, Text, View, FlatList, Image } from 'react-native';
import { GET_FAVORITE_CIGARS } from '../queries/clientQueries';

export default function CigarList() {
  const { loading, error, data } = useQuery(GET_FAVORITE_CIGARS);

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <>
      {!loading && !error && (
        <FlatList
          style={styles.listItems}
          data={data.favorites}
          renderItem={cigar => (
            <View key={cigar.index} style={styles.cigar}>
              <Text style={styles.listItem}>{cigar.item.name}</Text>
              <View style={styles.subTextWrap}>
                <Text style={styles.subText}>{cigar.item.brand}</Text><Text style={styles.subText}>Size: {cigar.item.size}</Text>
              </View>
              <View style={styles.attributesView}>
                <View>
                  <Text>{cigar.item.description}</Text>
                </View>
                <View style={styles.cigarAttributes}>
                  <View style={styles.cigarMake}>
                    <Text style={styles.cigarText}>
                      <Text style={styles.boldText}>Wrapper:</Text> {cigar.item.wrapper}
                    </Text>
                    <Text style={styles.cigarText}>
                      <Text style={styles.boldText}>Binder:</Text> {cigar.item.binder}
                    </Text>
                    <Text style={styles.cigarText}>
                      <Text style={styles.boldText}>Filler:</Text> {cigar.item.filler}
                    </Text>
                  </View>
                  <View style={styles.cigarContainer}>
                    <Image source={{ uri: cigar.item.image }} style={styles.cigarImage} />
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  cigar: {
    paddingBottom: 15
  },
  listItems: {
    paddingTop: 20,
    paddingHorizontal: 20
  },
  listItem: {
    paddingVertical: 5,
    fontSize: 18
  },
  subTextWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  subText: {
    fontSize: 12
  },
  attributesView: {
    display: 'none'
  },
  cigarAttributes: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    // borderWidth: 1,
    // borderColor: 'red'
  },
  cigarMake: {
    width: 250,
    fontWeight: 'bold',
    justifyContent: 'center'
  },
  cigarText: {
    fontSize: 12,
    lineHeight: 20
  },
  boldText: {
    fontWeight: 'bold'
  },
  cigarContainer: {
    // border: '1px solid red'
  },
  cigarImage: {
    flex: 1,
    aspectRatio: 2,
    resizeMode: 'contain',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center'
  }
});
