import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { GET_ALL_CIGARS, GET_FAVORITE_CIGARS } from '../queries/clientQueries';
import { ADD_FAVORITE_CIGAR } from '../mutations/clientMutations';

function AddFaveCigar({ toggleAddWindow }) {
  const { loading, error, data } = useQuery(GET_ALL_CIGARS);
  const [cigarBrand, setCigarBrand] = useState("");
  const [cigarName, setCigarName] = useState("");
  const [cigarDescription, setCigarDescription] = useState("");
  const [cigarSize, setCigarSize] = useState("");
  const [cigarWrapper, setCigarWrapper] = useState("");
  const [cigarBinder, setCigarBinder] = useState("");
  const [cigarFiller, setCigarFiller] = useState("");
  const [cigarImage, setCigarImage] = useState("");
  const [brandArr, setBrandArr] = useState([]);
  const [cigarNameArr, setCigarNameArr] = useState([]);
  const [cigarSizeArr, setCigarSizeArr] = useState([]);
  const [brandOpen, setBrandOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  
  const [addCigar] = useMutation(ADD_FAVORITE_CIGAR, {
    variables: { cigarBrand, cigarName, cigarDescription, cigarWrapper, cigarBinder, cigarFiller, cigarSize, cigarImage },
    update(cache, { data: { addCigar } }) {
      const { favorites } = cache.readQuery({
        query: GET_FAVORITE_CIGARS
      })
      cache.writeQuery({
        query: GET_FAVORITE_CIGARS,
        data: { favorites: [...favorites, addCigar] }
      })
    }
  })

  function addFavorite() {
    debugger
    addCigar(cigarBrand, cigarName, cigarDescription, cigarWrapper, cigarBinder, cigarFiller, cigarSize, cigarImage)

    setCigarBrand("")
    setCigarName("")
    setCigarDescription("")
    setCigarSize("")
    setCigarWrapper("")
    setCigarBinder("")
    setCigarFiller("")
    toggleAddWindow(false)
  }
  
  useEffect(() => {
    const filterByBrand = data?.cigars?.filter((objArr, index, arr) => index === arr.findIndex(obj => (obj.brand === objArr.brand)));
    let brandsArr = [];
    filterByBrand?.forEach((cigar, index) => {
      brandsArr.push({ label: cigar.brand, value: cigar.brand })
    });
    if (brandsArr.length !== 0) {
      setBrandArr(brandsArr);
    }
  }, [data]);

  useEffect(() => {
    data?.cigars?.map(cigar => {
      if (cigar.name === cigarName) {
        cigar.size.map(item => {
          if (item.length === cigarSize) {
            setCigarImage(item.image)
          }
        });
      }
    });
  }, [cigarSize]);

  function fillCigarName(brand) {
    const filterCigarByBrand = data?.cigars?.filter(objArr => (brand === objArr.brand));
    let cigarArr = [];
    filterCigarByBrand?.forEach((cigar, index) => {
      cigarArr.push({ label: cigar.name, value: cigar.name })
    });
    const cleanArr = cigarArr.filter((item, index, self) => {
      debugger
      index === self.findIndex(n => {
        debugger
        n.label === item.label
      })
    });
    setCigarNameArr(cleanArr);
  }

  function fillCigarSize(name) {
    const filterCigarSize = data?.cigars?.filter(objArr => (name === objArr.name));
    let cigarArr = [];
    filterCigarSize?.forEach(cigar => {
      cigar.size.map(item => {
        cigarArr.push({ label: item.length, value: item.length })
      })
    });

    if (filterCigarSize.length > 0) {
      setCigarDescription(filterCigarSize[0].description);
      setCigarWrapper(filterCigarSize[0].wrapper);
      setCigarBinder(filterCigarSize[0].binder);
      setCigarFiller(filterCigarSize[0].filler);
    }
    setCigarSizeArr(cigarArr);
  }
  
  return (
    <>
      {!loading && !error && (
        <View style={styles.faveContainer}>
          <Text style={styles.faveTitle}>New Favorite</Text>
          <Text style={styles.inputName}>Cigar Brand</Text>
          <DropDownPicker
            open={brandOpen}
            value={cigarBrand}
            items={brandArr}
            setOpen={setBrandOpen}
            setValue={setCigarBrand}
            placeholder="Select brand"
            zIndex={3000}
            zIndexInverse={1000}
            onChangeValue={(value) => {
              fillCigarName(value)
              setCigarBrand(value)
            }}
          />
          <Text style={styles.inputName}>Cigar Name</Text>
          <DropDownPicker
            open={nameOpen}
            value={cigarName}
            items={cigarNameArr}
            setOpen={setNameOpen}
            setValue={setCigarName}
            placeholder="Select cigar"
            zIndex={2000}
            zIndexInverse={2000}
            onChangeValue={(value) => {
              fillCigarSize(value)
            }}
          />
          <Text style={styles.inputName}>Size</Text>
          <DropDownPicker
            open={sizeOpen}
            value={cigarSize}
            items={cigarSizeArr}
            setOpen={setSizeOpen}
            setValue={setCigarSize}
            placeholder="Select size"
            zIndex={1000}
            zIndexInverse={1000}
          />
          <Pressable style={[styles.btnIconContainer, styles.boxShadow]} onPress={addFavorite}>
            <Text style={styles.textColor}>Add Favorite</Text>
          </Pressable>
        </View>
      )}
    </>
  )
}

export default AddFaveCigar;

const styles = StyleSheet.create({
  faveContainer: {
    backgroundColor: 'rgba(255,255,255,1)',
    position: 'absolute',
    top: '5%',
    left: 10,
    width: '95%', 
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  faveTitle: {
    fontSize: 25,
    textAlign: 'center',
    paddingBottom: 15
  },
  inputName: {
    paddingBottom: 5
  },
  inputBox: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderColor: 'grey',
    borderWidth: 1,
    borderRadius: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  btnIconContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: 'blue',
    marginTop: 20,
    width: '38%'
  },
  textColor: {
    color: 'white'
  }
});