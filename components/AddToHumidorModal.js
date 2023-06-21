import { useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMutation } from '@apollo/client';
import DropDownPicker from 'react-native-dropdown-picker';
import { useOnClickOutside } from '../hooks/useOnClickOutside'
import { ADD_HUMIDOR_CIGAR } from '../mutations/clientMutations'
import {
  GET_HUMIDOR_CIGARS,
} from '../queries/clientQueries'

function AddToHumidorModal({
  toggleAddWindow,
  fillCigarSize,
  fillCigarName,
  addCigarToHumidor,
  brandArr,
  cigarNameArr,
  cigarSizeArr,
  cigarDescription,
  cigarWrapper,
  cigarFiller,
  cigarBinder,
  cigarImage,
  resetModal
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [cigarBrand, setCigarBrand] = useState("");
  const [cigarName, setCigarName] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [cigarSize, setCigarSize] = useState("");
  const ref = useRef()

  const [addToHumidor] = useMutation(ADD_HUMIDOR_CIGAR, {
    variables: { cigarBrand, cigarName, cigarDescription, cigarWrapper, cigarBinder, cigarFiller, cigarSize, cigarImage },
    update(cache, { data: { addToHumidor } }) {
      const { humidor } = cache.readQuery({
        query: GET_HUMIDOR_CIGARS
      })
      cache.writeQuery({
        query: GET_HUMIDOR_CIGARS,
        data: { humidor: [...humidor, addToHumidor] }
      })
    }
  })

  function addCigarToHumidor() {
    addToHumidor(cigarBrand, cigarName, cigarDescription, cigarWrapper, cigarBinder, cigarFiller, cigarSize, cigarImage)

    setCigarBrand("")
    setCigarName("")
    setCigarSize("")
    toggleAddWindow(false)

    resetModal()
  }

  useOnClickOutside(ref, () => {
    toggleAddWindow(false)
  })

  return (
    <>
      {
        <View style={toggleAddWindow ? styles.modalBg : "" }>
          <View style={[styles.faveContainer, toggleAddWindow ? "" : styles.closeModal]} ref={ref}>
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
            <Pressable style={[styles.btnIconContainer, styles.boxShadow]} onPress={addCigarToHumidor}>
              <Text style={styles.textColor}>Add To Humidor</Text>
            </Pressable>
            </View>
          </View>
      }
    </>
  )
}

export default AddToHumidorModal;

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
  modalBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,.5)',
    width: '100%',
    height: '100%'
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
    width: '40%'
  },
  textColor: {
    color: 'white'
  },
  closeModal: {
    display: 'none'
  },
});