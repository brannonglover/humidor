import { gql } from '@apollo/client'

export const GET_ALL_CIGARS = gql`
  query getCigars {
    cigars {
      name
      description
      brand
      wrapper
      binder
      filler
      image
      size {
        length
        image
      }
    }
  }
`;

export const GET_FAVORITE_CIGARS = gql`
  query getFavoriteCigars {
    favorites {
      brand
      name
      wrapper
      binder
      filler
      description
      image
      size
    }
  }
`;