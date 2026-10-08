package br.org.fies.stbp.cadastro;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface InstituicaoRepository extends JpaRepository<Instituicao, Long> {

    Optional<Instituicao> findByNomeIgnoreCase(String nome);

    @Modifying
    @Query(value = "delete from unidade_instituicao where instituicao_id = :id", nativeQuery = true)
    void desvincularUnidades(Long id);
}
